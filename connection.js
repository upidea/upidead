"use strict";
// a single connection
var path        = require('path');
var fs          = require('fs');
var dns         = require('dns');
var constants   = require('./constants');
var config      = require('./config');
var logger      = require('./logger');
var uuid        = require('./utils').uuid;
var protocols     = require('./protocols');
var plugins     = require('./plugins');
var date_to_str = require('./utils').date_to_str;
var ipaddr      = require('ipaddr.js');
// 这个package在windows下需要python支持， 要装的东西太多， 不胜其烦，放弃了
// var buffertools = require('buffertools');
var hexy      = require('hexy');
var bufferpack = require('bufferpack');

/*
var trans       = require('./transaction');
var rfc1869     = require('./rfc1869');
var Address     = require('./address').Address;
var outbound    = require('./outbound');
*/

var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), 'utf8'));
var version = pkg.version;
var program = pkg.name.toUpperCase();

var line_regexp = /^([^\n]*\n)/;

var connection = exports;

var STATE_CMD   = 1;
var STATE_LOOP  = 2;
var STATE_PAUSE = 4;
var STATE_PAUSE_CMD = 5;
var STATE_BIN = 6;

// 导入协议
Connection.prototype = protocols;

// copy logger methods into Connection:
for (var key in logger) {
    if (key.match(/^log\w/)) {
        Connection.prototype[key] = (function (key) {
            return function () {
                // pass the connection instance to logger
                var args = [ this ];
                for (var i=0, l=arguments.length; i<l; i++) {
                    args.push(arguments[i]);
                }
                logger[key].apply(logger, args);
            }
        })(key);
    }
}

function setupClient(self) {
    var ip = self.client.remoteAddress;
    if (!ip) {
        self.logdebug('setupClient got no IP address for this connection!');
        self.client.destroy();
        return;
    }

    self.remote_ip = ipaddr.process(ip).toString();
    self.remote_port = self.client.remotePort;
    self.lognotice("connect ip=" + self.remote_ip + ' port=' + self.remote_port);

    self.client.on('end', function() {
        if (!self.disconnected) {
            self.remote_close = true;
            self.fail('client ' + ((self.remote_host) ? self.remote_host + ' ' : '') 
                                + '[' + self.remote_ip + '] closed connection');
        }
    });

    self.client.on('close', function(has_error) {
        if (!self.disconnected && !has_error) {
            self.remote_close = true;
            self.fail('client ' + ((self.remote_host) ? self.remote_host + ' ' : '')
                                + '[' + self.remote_ip + '] dropped connection');
        }
    });

    self.client.on('error', function (err) {
        if (!self.disconnected) {
            self.fail('client ' + ((self.remote_host) ? self.remote_host + ' ' : '') 
                                + '[' + self.remote_ip + '] connection error: ' + err);
        }
    });
    
    self.client.on('timeout', function () {
        if (!self.disconnected) {
            self.respond(421, 'timeout');
            self.fail('client ' + ((self.remote_host) ? self.remote_host + ' ' : '')
                                + '[' + self.remote_ip + '] connection timed out');
        }
    });
    
    self.client.on('data', function (data) {
        self.process_data(data);
    });

    plugins.run_hooks('connect', self);
}

function Connection(client, server) {
    this.client = client;
    this.server = server;
    console.log("I'm right here!!!!");
    console.log(this.server.db);
    console.log("111111111111I'm right here!!!!");
    
    this.current_data = new Buffer(0);
    this.current_line = null;
    this.state = STATE_PAUSE;
    this.uuid = uuid();
    this.notes = {};
    this.tran_count = 0;
    this.early_talker_delay = config.get('early_talker_delay') || 1000;
    this.banner_includes_uuid = config.get('banner_includes_uuid') ? true : false;
    this.deny_includes_uuid = config.get('deny_includes_uuid') ? true : false;
    this.early_talker = 0;
    this.pipelining = 0;
    this.relaying = false;
    this.disconnected = false;
    this.last_response = null;
    this.remote_close = false;
    this.hooks_to_run = [];
    this.start_time = Date.now();
    this.last_reject = '';
    this.totalbytes = 0;
    setupClient(this);
}

exports.Connection = Connection;

exports.createConnection = function(client, server) {
    var s = new Connection(client, server);
    return s;
}

Connection.prototype.process_line = function (line) {
    var self = this;
    
    if(line[0] === 0x60)
    {
        this.current_line = line;  // 不确定这里是否会做数据拷贝影响性能
        if (this.state === STATE_CMD) {
            this.state = STATE_PAUSE_CMD;
            
            var packet_header = bufferpack.unpack('>B(ucFlag)H(usLen)B(ucCPkg)B(ucTPkg)H(usCmd)B(ucSubCmd)', line, 0);
            var protocols_handle_method = "handle_cmd_" + packet_header.usCmd;
            console.log(protocols_handle_method);
            console.log(packet_header);
            console.log(hexy.hexy(line));
            if(this[protocols_handle_method]) {
            	console.log("tocall");
            	// this[protocols_handle_method](packet_header, line);
            	this[protocols_handle_method].call(this, packet_header, line);
            } else {
				plugins.run_hooks('unrecognized_command', this, protocols_handle_method);            	
            }
        }
    } else {
        // 
        line = line.slice(1).toString('binary');
        // this.logprotocol("C: " + line + ' state=' + this.state);
        // Check for non-ASCII characters
        if (/[^\x00-\x7F]/.test(line)) {
            return this.respond(501, 'Syntax error');
        }
    
        if (this.state === STATE_CMD) {
            this.state = STATE_PAUSE_CMD;
            this.current_line = line.replace(/\r?\n/, '');
            var matches = /^([^ ]*)( +(.*))?$/.exec(this.current_line);
            if (!matches) {
                return plugins.run_hooks('unrecognized_command', this, this.current_line);
            }
            var method = "handle_cmd_" + matches[1].toLowerCase();
            
            var remaining = matches[3] || '';
            if (this[method]) {
                try {
                    this[method](remaining);
                }
                catch (err) {
                    if (err.stack) {
                        var c = this;
                        c.logerror(method + " failed: " + err);
                        err.stack.split("\n").forEach(c.logerror);
                    }
                    else {
                        this.logerror(method + " failed: " + err);
                    }
                    this.respond(500, "Internal Server Error", function() {
                        self.disconnect();
                    });
                }
            }
            else {
                // unrecognised command
                matches.splice(0,1);
                matches.splice(1,1);
                plugins.run_hooks('unrecognized_command', this, matches);
            }
        }
        else if (this.state === STATE_LOOP) {
            // Allow QUIT
            if (line.replace(/\r?\n/, '').toUpperCase() === 'QUIT') {
                this.cmd_quit();
            } 
            else {
                this.respond(this.loop_code, this.loop_msg);
            }
        }

    }

};

Connection.prototype.process_data = function (data) {
    if (this.disconnected) {
        this.logwarn("data after disconnect from " + this.remote_ip);
        return;
    }

    this.current_data = Buffer.concat([this.current_data, data]);
    this._process_data();
};

// 有待考虑的问题是， 如果第一个字符是`，然后长度很大，一致不输入，会怎样呢？
// 等待连接超时么？
Connection.prototype._find_packet = function(data)
{
    if(!data || data.length < 2) return null;
    
    // 协议的第一个字符如果是~则表明下一条协议是文本协议
    // 协议的第一个字符如果是`则表明下一条协议是二进制协议
    if(data[0] == 0x60){   // `
        // 二进制协议
        var current_len = data.length;  // 这里以buffer的长度来判定收到的数据长度， 感受上觉得是个隐患，有待测试
        if( (current_len > 8) && current_len > data.readUInt16BE(1) )
        {
            return data.slice(0, 8+data.readUInt16BE(1));
        }
        else
            return null;
    } else { // if(data[0] == 0x7e) {   // ~
        var results;
        if(results = line_regexp.exec(data))
            return results[1];
        else
            return results;  // return null;
    }
}

Connection.prototype._process_data = function() {
    // We *must* detect disconnected connections here as the state 
    // only transitions to STATE_CMD in the respond function below.
    // Otherwise if multiple commands are pipelined and then the 
    // connection is dropped; we'll end up in the function forever.
    if (this.disconnected) return;
    var this_line;
    
    while (this_line = this._find_packet(this.current_data)) {
        console.log("this_line:\n"+hexy.hexy(this_line));
        if (this.state === STATE_PAUSE  || this.state === STATE_PAUSE_CMD) {
            if (!this.early_talker) {
                this.logdebug('[early_talker] state=' + this.state + ' line="' + this_line + '"');
            }            
            this.early_talker = 1;
            var self = this;
            // If you talk early, we're going to give you a delay
            setTimeout(function() { self._process_data() }, this.early_talker_delay);
            break;
        }
        else {
            this.current_data = this.current_data.slice(this_line.length);
            this.process_line(this_line);
        }
    }
};

Connection.prototype.respond = function(code, msg, func) {
    var uuid = '';
    var messages;

    if (this.disconnected) {
        return;
    }
    
    if(!code)
    {
    	// 处理二进制数据的返回
	    try {
	        this.client.write(buf);
	    }
	    catch (err) {
	        return this.fail("Writing response: " + buf + " failed: " + err);
	    }
    } else 	{
	    // Check to see if DSN object was passed in
	    if (typeof msg === 'object' && msg.constructor.name === 'DSN') {
	        // Override
	        code = msg.code;
	        msg = msg.reply;
	    }
	    if (!(Array.isArray(msg))) {
	        // msg not an array, make it so:
	        messages = [ '' + msg ];
	    } else {
	        // copy
	        messages = msg.slice();
	    }
	
	    if (code >= 400) {
	        this.last_reject = code + ' ' + messages.join(' ');
	        if (this.deny_includes_uuid) {
	            uuid = (this.transaction || this).uuid;
	            if (this.deny_includes_uuid > 1) {
	                uuid = uuid.substr(0, this.deny_includes_uuid);
	            }
	        }
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
	}


    // Don't change loop state
    if (this.state !== STATE_LOOP) {
        this.state = STATE_CMD;
    }


    // Run optional closure before handling and further commands
    if (func) func();

    // Process any buffered commands (PIPELINING)
    this._process_data();
};

Connection.prototype.fail = function (err) {
    this.logwarn(err);
    this.hooks_to_run = [];
    this.disconnect();
}

Connection.prototype.disconnect = function() {
    if (this.disconnected) return;
    plugins.run_hooks('disconnect', this);
};

Connection.prototype.run_hooks = function(hook, object) {
    plugins.run_hooks(hook, object);
};

Connection.prototype.response_cmd_disconnect = function () {
    this.disconnected = true;
    var logdetail = [
        'ip='    + this.remote_ip,
        'rdns="' + ((this.remote_host) ? this.remote_host : '') + '"',
        'helo="' + ((this.hello_host) ? this.hello_host : '') + '"',
        'relay=' + (this.relaying ? 'Y' : 'N'),
        'early=' + (this.early_talker ? 'Y' : 'N'),
        'tls='   + (this.using_tls ? 'Y' : 'N'),
        'pipe='  + (this.pipelining ? 'Y' : 'N'),
        'txns='  + this.tran_count,
        'bytes=' + this.totalbytes,
        'lr="'   + ((this.last_reject) ? this.last_reject : '') + '"',
        'time='  + (Date.now() - this.start_time)/1000,
    ];
    this.lognotice('disconnect ' + logdetail.join(' '));
    this.client.end();
};

Connection.prototype.response_cmd_loop = function (code, msg) {
    this.state = STATE_LOOP;
    this.loop_code = code;
    this.loop_msg = msg;
    this.respond(code, msg);
}

Connection.prototype.response_cmd_unrecognized_command = function(retval, msg) {
    var self = this;
    switch(retval) {
        case constants.ok:
                // response already sent, cool...
                break;
        case constants.next_hook:
                plugins.run_hooks(msg, this);
                break;
        case constants.deny:
                this.respond(500, msg || "Unrecognized command");
                break;
        case constants.denydisconnect:
                this.respond(521, msg || "Unrecognized command", function () {
                    self.disconnect();
                });
                break;
        default:
                this.respond(500, msg || "Unrecognized command");
    }
};

Connection.prototype.response_cmd_connect = function(retval, msg) {
    var self = this;
    // RFC 5321 Section 4.3.2 states that the only valid SMTP codes here are:
    // 220 = Service ready
    // 554 = Transaction failed (no SMTP service here)
    // 421 = Service shutting down and closing transmission channel
    switch (retval) {
        case constants.deny:
                this.loop_respond(554, msg || "Your mail is not welcome here");
                break;
        case constants.denydisconnect:
        case constants.disconnect:
                this.respond(554, msg || "Your mail is not welcome here", function() {
                    self.disconnect();
                });
                break;
        case constants.denysoft:
                this.loop_respond(421, msg || "Come back later");
                break;
        case constants.denysoftdisconnect:
                this.respond(421, msg || "Come back later", function() {
                    self.disconnect();
                });
                break;
        default:
                var greeting = config.get('smtpgreeting', 'list');
                if (greeting.length) {
                    if (this.banner_includes_uuid) {
                        greeting[0] += ' (' + this.uuid + ')'; 
                    }
                }
                else {
                    greeting = config.get('me') + program + version + " ready";
                    if (this.banner_includes_uuid) {
                        greeting += ' (' + this.uuid + ')';
                    }
                }
                this.respond(220, msg || greeting);
    }
};
