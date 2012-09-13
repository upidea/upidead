"use strict";
// load all defined protocols

var logger      = require('./logger');
var config      = require('./config');
var constants   = require('./constants');
var path        = require('path');
var vm          = require('vm');
var fs          = require('fs');
var utils       = require('./utils');
var util        = require('util');

// 定义protocols文件所在的路径
var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), 'utf8'));
var program = pkg.name.toUpperCase();
var protocol_paths = [path.join(__dirname, './protocols')];
if (process.env[program]) { protocol_paths.unshift(path.join(process.env[program], 'protocols')); }

function Protocol(name) {
    this.name = name;
    this.base = {};
    this.timeout = config.get(name + '.timeout');
    if (this.timeout === null) {
        this.timeout = config.get('protocol_timeout') || 30;
    }
    else {
        logger.logdebug("protocol " + name + " set timeout to: " + this.timeout + "s");
    }
    var full_paths = []
    protocol_paths.forEach(function (pp) {
        full_paths.push(path.resolve(pp, name) + '.js');
    });
    this.full_paths = full_paths;
    this.config = config;
    this.hooks = {};
};

Protocol.prototype.register_hook = function(hook_name, method_name) {
    this.hooks[hook_name] = this.hooks[hook_name] || [];
    // bud每想明白为什么要用push来构建数组，直接复制不是就可以了么？这是只是要
    // 这个hook对应的hook_XXXX的函数名字嘛
    this.hooks[hook_name].push(method_name);
    // console.log(this.hooks[hook_name]);

    logger.logdebug("registered hook " + hook_name + " to " + this.name + "." + method_name);
}

Protocol.prototype.register = function () {}; // noop

Protocol.prototype.inherits = function (parent_name) {
    var parent_protocol = protocols._load_and_compile_protocol(parent_name);
    for (var method in parent_protocol) {
        if (!this[method]) {
            this[method] = parent_protocol[method];
        }
    }
    if (parent_protocol.register) {
        parent_protocol.register.call(this);
    }
    this.base[parent_name] = parent_protocol;
}

// copy logger methods into Protocol:
for (var key in logger) {
    if (key.match(/^log\w/)) {
        Protocol.prototype[key] = (function (key) {
            return function () {
                var args = [this];
                for (var i=0, l=arguments.length; i<l; i++) {
                    args.push(arguments[i]);
                }
                logger[key].apply(logger, args);
            }
        })(key);
    }
}

var protocols = exports;

protocols.Protocol = Protocol;

protocols.protocol_list = {};

protocols.load_protocols = function () {
    logger.loginfo("Loading protocols");
    var protocol_list = config.get('protocols', 'list');
    
    protocol_list.forEach(protocols.load_protocol);
    
    console.log(protocols.protocol_list);
    

    logger.dump_logs(); // now logging protocols are loaded.
};

protocols.load_protocol = function(name) {
    logger.loginfo("Loading protocol: " + name);

    var protocol = protocols._load_and_compile_protocol(name);

    if (protocol) {
        protocols._register_protocol(protocol);
    }

    // 这里默认规则是cmd和配置中加载的protocol文件名是一致的，因为后面根据这个
    // cmd来索引和找到协议处理函数，不太理想，但是是目前选择的处理办法
    protocols.protocol_list[name] = protocol;
}

// Set in server.js; initialized to empty object
// to prevent it from blowing up any unit tests.
protocols.server = {};

protocols._load_and_compile_protocol = function(name) {
    var protocol = new Protocol(name);
    var fp = protocol.full_paths,
        rf, last_err;
    for (var i=0, j=fp.length; i<j; i++) {
        try {
            rf = fs.readFileSync(fp[i]);
            break;
        }
        catch (err) {
            last_err = err;
            continue;
        }
    }
    if (!rf) {
        if (config.get('smtp.ini').main.ignore_bad_protocols) {
            logger.logcrit("Loading protocol " + name + " failed: " + last_err);
            return;
        }
        throw "Loading protocol " + name + " failed: " + last_err;
    }
    var code = '"use strict";' + rf;
    var sandbox = { 
        require: require,
        __filename: fp[i],
        __dirname:  path.dirname(fp[i]),
        exports: protocol,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        process: process,
        Buffer: Buffer,
        Math: Math,
        server: protocols.server,
    };
    // constants的import方法， 结果是将constants中定义的变量全部以大写方式导入到sandbox类中，即，函数执行后， 
    // sandbox.CONT = 900; sandbox.OK = 906; ...
    // 
    constants.import(sandbox);
    try {
        vm.runInNewContext(code, sandbox, name);
    }
    catch (err) {
        logger.logcrit("Compiling protocol: " + name + " failed");
        if (config.get('smtp.ini').main.ignore_bad_protocols) {
            logger.logcrit("Loading protocol " + name + " failed: ", err.message
                           + " - will skip this protocol and continue");
            return;
        }
        throw err; // default is to re-throw and stop main server
    }
    
    return protocol;
}

protocols._register_protocol = function (protocol) {
    protocol.register();
    
    // register any handle_blah methods.
    for (var method in protocol) {
        var result;
        if (result = method.match(/^handle_(\w+)\b/)) {
            protocol.register_hook(result[1], method);
        }
    }
    
    return protocol;
}

// 方法的参数分别是： hook的函数名称， 执行hook的对象， 函数的参数；例如：
// protocols.run_hooks('helo', this, host);
protocols.run_hooks = function (hook, object, params) {
    // Bail out if the client has disconnected
    if (object.constructor.name === 'Connection' && object.disconnected) {
        if (hook != 'log') {
            object.logdebug('aborting ' + hook + ' hook as client has disconnected');
        }
        return;
    }

    if (hook != 'log')
        object.logdebug("running " + hook + " hooks");
    
    // 执行run_hooks时， hooks_to_run应该为未定义或者为空，否则表示该hook正在被重复调用
    if (hook != 'deny' && hook != 'log' && object.hooks_to_run && object.hooks_to_run.length) {
        throw new Error("We are already running hooks! Fatal error!");
    }

    if (hook === 'deny') {
        // Save the hooks_to_run list so that we can run any remaining 
        // protocols on the previous hook once this hook is complete.
        object.saved_hooks_to_run = object.hooks_to_run;
    }
    object.hooks_to_run = [];
    
    for (var i = 0; i < protocols.protocol_list.length; i++) {
        var protocol = protocols.protocol_list[i];
        
        // protocol.hooks[hook] 需要执行的hook函数
        // 对应40行， 我觉得protocol.hooks[hook].length始终是1， 没明白为什么用数组
        if (protocol && protocol.hooks[hook]) {
            var j;
            for (j = 0; j < protocol.hooks[hook].length; j++) {
                var hook_code_name = protocol.hooks[hook][j];
                object.hooks_to_run.push([protocol, hook_code_name]);
            }
        }
    }
    
    protocols.run_next_hook(hook, object, params);
};

// 方法的参数分别是： hook的函数名称， 执行hook的对象， 函数的参数；
// 其中， object在本函数的调用方法run_hooks中赋予了 hooks_to_run 的属性
// hooks_to_run是一个数组，数组的第一个元素是 包含hook函数的对象， 第二个元素是hook函数的函数名
// 
protocols.run_next_hook = function(hook, object, params) {
    // Bail if client has disconnected
    if (object.constructor.name === 'Connection' && object.disconnected) {
        object.logdebug('aborting ' + hook + ' hook as client has disconnected');
        return;
    }
    var called_once = 0;
    var timeout_id;
    var timed_out = false;
    var item;
    var callback = function(retval, msg) {
        if (timeout_id) clearTimeout(timeout_id);
        // Bail if client has disconnected
        if (object.constructor.name === 'Connection' && object.disconnected) {
            object.logdebug('ignoring ' + item[0].name + ' protocol callback as client has disconnected');
            return;
        }
        if (called_once && hook != 'log') {
            if (!timed_out) {
                object.logerror(item[0].name + ' protocol ran callback multiple times - ignoring subsequent calls');
                // Write a stack trace to the log to aid debugging
                object.logerror((new Error).stack);
            }
            return;
        }
        called_once++;
        if (!retval) retval = constants.cont;
        // Log what is being run
        if (item && hook !== 'log') {
            var log = 'logdebug';
            var is_not_cont = (retval !== constants.cont && logger.would_log(logger.LOGINFO));
            if (is_not_cont) log = 'loginfo';
            if (is_not_cont || logger.would_log(logger.LOGDEBUG)) {
                object[log]([
                    'hook='     + hook,
                    'protocol='   + item[0].name,
                    'function=' + item[1], 
                    'params="'  + ((params) ? ((typeof params === 'string') ? params : params[0]) : '') + '"',
                    'retval='   + constants.translate(retval),
                    'msg="'     + ((msg) ? msg : '') + '"',
                ].join(' '));
            }
        }
        if (object.hooks_to_run.length == 0 || 
            retval !== constants.cont)
        {
            var respond_method = hook + "_respond";
            if (item && utils.in_array(retval, [constants.deny, constants.denysoft, constants.denydisconnect, constants.denysoftdisconnect])) {
                object.deny_respond = function (deny_retval, deny_msg) {
                    switch(deny_retval) {
                        case constants.ok:
                            // Override rejection
                            object.loginfo('deny(soft?) overriden by deny hook' + 
                                           (deny_msg ? ': ' + deny_msg : ''));
                            // Restore hooks_to_run with saved copy so that
                            // any other protocols on this hook can also run.
                            if (object.saved_hooks_to_run.length > 0) {
                                object.hooks_to_run = object.saved_hooks_to_run;
                                protocols.run_next_hook(hook, object, params);
                            }
                            else {
                                object[respond_method](constants.cont, deny_msg);
                            }
                            break;
                        default:
                            object.saved_hooks_to_run = [];
                            object.hooks_to_run = [];
                            object[respond_method](retval, msg);
                    }
                };
                protocols.run_hooks('deny', object, [retval, msg, item[0].name, item[1], params, hook]);
            }
            else {
                object.hooks_to_run = [];
                object[respond_method](retval, msg, params);
            }
        }
        else {
            protocols.run_next_hook(hook, object, params);
        }
    }
    
    if (!object.hooks_to_run.length) return callback();
    
    // shift the next one off the stack and run it.
    item = object.hooks_to_run.shift();

    if (item[0].timeout && hook != 'log') {
        timeout_id = setTimeout(function () {
            timed_out = true;
            object.logcrit("Protocol " + item[0].name + 
                " timed out on hook " + hook + " - make sure it calls the callback");
            callback(constants.denysoft, "protocol timeout");
        }, item[0].timeout * 1000);
    }
    
    if (hook != 'log')
        object.logdebug("running " + hook + " hook in " + item[0].name + " protocol");
    
    try {
        object.current_hook = item;
        // console.log(util.inspect(item, true, null));
        item[0][ item[1] ].call(item[0], callback, object, params);
    }
    catch (err) {
        if (hook != 'log') {
            object.logcrit("Protocol " + item[0].name + " failed: " + (err.stack || err));
        }
        callback();
    }
};

protocols.handle_protocol = function(object, packet) {
    // Bail if client has disconnected
    if (object.constructor.name === 'Connection' && object.disconnected) {
        // object.logdebug('aborting ' + hook + ' hook as client has disconnected');
        return;
    }
    var timeout_id;
    var timed_out = false;
    var item;
    var called_once = 0;    
    
    var callback = function(retval, msg) {
            console.log("===========herel.......=============");
            
        if (timeout_id) clearTimeout(timeout_id);
        // Bail if client has disconnected
        if (object.constructor.name === 'Connection' && object.disconnected) {
            object.logdebug('ignoring ' + item.name + ' protocol callback as client has disconnected');
            return;
        }
        if (called_once) {
            if (!timed_out) {
                object.logerror(item.name + ' protocol ran callback multiple times - ignoring subsequent calls');
                // Write a stack trace to the log to aid debugging
                object.logerror((new Error).stack);
            }
            return;
        }
        called_once++;
        if (!retval) retval = constants.ok;
        // Log what is being run
        if (item) {
            var log = 'logdebug';
            var is_not_cont = (retval !== constants.cont && logger.would_log(logger.LOGINFO));
            if (is_not_cont) log = 'loginfo';
            if (is_not_cont || logger.would_log(logger.LOGDEBUG)) {
                object[log]([
                    'protocol='   + item.name,
                    'packet="'  + packet.toString('binary'),
                    'retval='   + constants.translate(retval),
                    'msg="'     + ((msg) ? msg : '') + '"',
                ].join(' '));
            }
        }
        
        if(retval !== constants.ok)
        {
            // 常规应答包
        }

        // 应答处理完毕，做收尾工作
        // 如果result不为OK， 应答一个常规应答包
        /*
        var uuid = '';
        var messages;
    
        if (this.disconnected) {
            return;
        }

        if (!(Array.isArray(msg))) {
            // msg not an array, make it so:
            messages = [ '' + msg ];
        } else {
            // copy
            messages = msg.slice();
        }
    
        
        var mess;
        var buf = '';
    
        while (mess = messages.shift()) {
            var line = code + (messages.length ? "-" : " ") + 
                (uuid ? '[' + uuid + '] ' : '' ) + mess;
            this.logprotocol("S: " + line);
            buf = buf + line + "\r\n";
        }
    
        try {
            this.client.write(buf);
        }
        catch (err) {
            return this.fail("Writing response: " + buf + " failed: " + err);
        }
    
        // Store the last response
        this.last_response = buf;
        */
        object.respond(0);
/*        
console.log("eSTAT1: " + object.state);    
        // Don't change loop state
        if (object.state !== object.STATE_LOOP) {
            object.state = object.STATE_CMD;
        }
console.log("eSTAT2: " + object.state);

        // Process any buffered commands (PIPELINING)
        object._process_data();
*/        
    }

    // console.log(protocols.protocol_list);
    // console.log(packet_header.usCmd);
    // 对二进制， 解开包头
    
    // assert 等读到包头中的第五第六个字节(长度够不够？)
    var protocol_key = '' + packet.readUInt16BE(5);
    if(protocols.protocol_list && protocols.protocol_list[protocol_key])
    {
        item = protocols.protocol_list[protocol_key];
        console.log(item);

        if (item.timeout) {
            timeout_id = setTimeout(function () {
                timed_out = true;
                object.logcrit("Protocol " + item.name + 
                    " timed out - make sure it calls the callback");
                callback(constants.denysoft, "protocol timeout");
            }, item.timeout * 1000);
        }
        
        object.logdebug("running protocol in " + item.name + " protocol");
        
        try {
            object.current_hook = item;
            item["handle_" + protocol_key].call(item, callback, object, packet);
        }
        catch (err) {
            object.logcrit("Protocol " + item.name + " failed: " + (err.stack || err));
            callback();
        }

    }
    
};

