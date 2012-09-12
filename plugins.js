"use strict";
// load all defined plugins

var logger      = require('./logger');
var config      = require('./config');
var constants   = require('./constants');
var path        = require('path');
var vm          = require('vm');
var fs          = require('fs');
var utils       = require('./utils');
var util        = require('util');

// 定义plugins文件所在的路径
var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), 'utf8'));
var program = pkg.name.toUpperCase();
var plugin_paths = [path.join(__dirname, './plugins')];
if (process.env[program]) { plugin_paths.unshift(path.join(process.env[program], 'plugins')); }

function Plugin(name) {
    this.name = name;
    this.base = {};
    this.timeout = config.get(name + '.timeout');
    if (this.timeout === null) {
        this.timeout = config.get('plugin_timeout') || 30;
    }
    else {
        logger.logdebug("plugin " + name + " set timeout to: " + this.timeout + "s");
    }
    var full_paths = []
    plugin_paths.forEach(function (pp) {
        full_paths.push(path.resolve(pp, name) + '.js');
    });
    this.full_paths = full_paths;
    this.config = config;
    this.hooks = {};
};

Plugin.prototype.register_hook = function(hook_name, method_name) {
    this.hooks[hook_name] = this.hooks[hook_name] || [];
    // bud每想明白为什么要用push来构建数组，直接复制不是就可以了么？这是只是要
    // 这个hook对应的hook_XXXX的函数名字嘛
    this.hooks[hook_name].push(method_name);

    logger.logdebug("registered hook " + hook_name + " to " + this.name + "." + method_name);
}

Plugin.prototype.register = function () {}; // noop

Plugin.prototype.inherits = function (parent_name) {
    var parent_plugin = plugins._load_and_compile_plugin(parent_name);
    for (var method in parent_plugin) {
        if (!this[method]) {
            this[method] = parent_plugin[method];
        }
    }
    if (parent_plugin.register) {
        parent_plugin.register.call(this);
    }
    this.base[parent_name] = parent_plugin;
}

// copy logger methods into Plugin:
for (var key in logger) {
    if (key.match(/^log\w/)) {
        Plugin.prototype[key] = (function (key) {
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

var plugins = exports;

plugins.Plugin = Plugin;

plugins.load_plugins = function () {
    logger.loginfo("Loading plugins");
    var plugin_list = config.get('plugins', 'list');
    
    // map为Array的方法， 对每个元素执行制定方法并返回结果数组
    /*
    [ { name: 'bud',
        hooks: { budtry: [ 'hook_budtry', [length]: 1 ] },
        full_paths: [ '/home/bud/node/tcp/Haraka/plugins/bud.js', [length]: 1 ],
        hook_budtry: Function, 
        config: 
         { get: Function},
        register: Function,
        timeout: 30,
        base: {} },
      { name: 'bud1',
        hooks: { budtry: [ 'hook_budtry', [length]: 1 ] },
        full_paths: [ '/home/bud/node/tcp/Haraka/plugins/bud1.js', [length]: 1 ],
        hook_budtry: Function,
        config: 
         { get: Function },
        register: Function,
        timeout: 30,
        base: {} },
      [length]: 2 ]    
    */
    plugins.plugin_list = plugin_list.map(plugins.load_plugin);

    logger.dump_logs(); // now logging plugins are loaded.
};

plugins.load_plugin = function(name) {
    logger.loginfo("Loading plugin: " + name);

    var plugin = plugins._load_and_compile_plugin(name);
    if (plugin) {
        plugins._register_plugin(plugin);
    }

    return plugin;
}

// Set in server.js; initialized to empty object
// to prevent it from blowing up any unit tests.
plugins.server = {};

plugins._load_and_compile_plugin = function(name) {
    var plugin = new Plugin(name);
    var fp = plugin.full_paths,
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
        if (config.get('smtp.ini').main.ignore_bad_plugins) {
            logger.logcrit("Loading plugin " + name + " failed: " + last_err);
            return;
        }
        throw "Loading plugin " + name + " failed: " + last_err;
    }
    var code = '"use strict";' + rf;
    var sandbox = { 
        require: require,
        __filename: fp[i],
        __dirname:  path.dirname(fp[i]),
        exports: plugin,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        process: process,
        Buffer: Buffer,
        Math: Math,
        server: plugins.server,
    };
    // constants的import方法， 结果是将constants中定义的变量全部以大写方式导入到sandbox类中，即，函数执行后， 
    // sandbox.CONT = 900; sandbox.OK = 906; ...
    // 
    constants.import(sandbox);
    try {
        vm.runInNewContext(code, sandbox, name);
    }
    catch (err) {
        logger.logcrit("Compiling plugin: " + name + " failed");
        if (config.get('smtp.ini').main.ignore_bad_plugins) {
            logger.logcrit("Loading plugin " + name + " failed: ", err.message
                           + " - will skip this plugin and continue");
            return;
        }
        throw err; // default is to re-throw and stop main server
    }
    
    return plugin;
}

plugins._register_plugin = function (plugin) {
    plugin.register();
    
    // register any hook_blah methods.
    for (var method in plugin) {
        var result;
        if (result = method.match(/^hook_(\w+)\b/)) {
            plugin.register_hook(result[1], method);
        }
    }
    
    return plugin;
}

// 方法的参数分别是： hook的函数名称， 执行hook的对象， 函数的参数；例如：
// plugins.run_hooks('helo', this, host);
plugins.run_hooks = function (hook, object, params) {
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
        // plugins on the previous hook once this hook is complete.
        object.saved_hooks_to_run = object.hooks_to_run;
    }
    object.hooks_to_run = [];
    
    for (var i = 0; i < plugins.plugin_list.length; i++) {
        var plugin = plugins.plugin_list[i];
        
        // plugin.hooks[hook] 需要执行的hook函数
        // 对应40行， 我觉得plugin.hooks[hook].length始终是1， 没明白为什么用数组
        if (plugin && plugin.hooks[hook]) {
            var j;
            for (j = 0; j < plugin.hooks[hook].length; j++) {
                var hook_code_name = plugin.hooks[hook][j];
                object.hooks_to_run.push([plugin, hook_code_name]);
            }
        }
    }
    
    plugins.run_next_hook(hook, object, params);
};

// 方法的参数分别是： hook的函数名称， 执行hook的对象， 函数的参数；
// 其中， object在本函数的调用方法run_hooks中赋予了 hooks_to_run 的属性
// hooks_to_run是一个数组，数组的第一个元素是 包含hook函数的对象， 第二个元素是hook函数的函数名
// 
plugins.run_next_hook = function(hook, object, params) {
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
            object.logdebug('ignoring ' + item[0].name + ' plugin callback as client has disconnected');
            return;
        }
        if (called_once && hook != 'log') {
            if (!timed_out) {
                object.logerror(item[0].name + ' plugin ran callback multiple times - ignoring subsequent calls');
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
                    'plugin='   + item[0].name,
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
                            // any other plugins on this hook can also run.
                            if (object.saved_hooks_to_run.length > 0) {
                                object.hooks_to_run = object.saved_hooks_to_run;
                                plugins.run_next_hook(hook, object, params);
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
                plugins.run_hooks('deny', object, [retval, msg, item[0].name, item[1], params, hook]);
            }
            else {
                object.hooks_to_run = [];
                object[respond_method](retval, msg, params);
            }
        }
        else {
            plugins.run_next_hook(hook, object, params);
        }
    }
    
    if (!object.hooks_to_run.length) return callback();
    
    // shift the next one off the stack and run it.
    item = object.hooks_to_run.shift();

    if (item[0].timeout && hook != 'log') {
        timeout_id = setTimeout(function () {
            timed_out = true;
            object.logcrit("Plugin " + item[0].name + 
                " timed out on hook " + hook + " - make sure it calls the callback");
            callback(constants.denysoft, "plugin timeout");
        }, item[0].timeout * 1000);
    }
    
    if (hook != 'log')
        object.logdebug("running " + hook + " hook in " + item[0].name + " plugin");
    
    try {
        object.current_hook = item;
        // console.log(util.inspect(item, true, null));
        item[0][ item[1] ].call(item[0], callback, object, params);
    }
    catch (err) {
        if (hook != 'log') {
            object.logcrit("Plugin " + item[0].name + " failed: " + (err.stack || err));
        }
        callback();
    }
};

