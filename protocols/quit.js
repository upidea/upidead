// protocol cmds 1024, 用户相关协议

var cfg;

exports.register = function() {
    // 我想在register里面做一些配置、预设之类的事情
}

// 三个参数分别是协议头， Connections对象， 协议数据包体(包含8个字节的包头)
exports.handle_quit = function(response, connection, packet_header, packet)
{
    // 解包
    // 数据处理
    // 发送应答
    
/*****
    参考response
    try {
        this.client.write(buf);
    }
    catch (err) {
        return this.fail("Writing response: " + buf + " failed: " + err);
    }

    // Store the last response
    this.last_response = buf;

    // Don't change loop state
    if (this.state !== STATE_LOOP) {
        this.state = STATE_CMD;
    }

    // Run optional closure before handling and further commands
    if (func) func();

    // Process any buffered commands (PIPELINING)
    this._process_data();
****/
      var buf = new Buffer([ 
                0x18, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
                0x7a, 0x32, 0x00, 0x00, 0xa9, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
                0x00, 0x00, 0x00, 0x00, 0x3b, 0x00, 0x00, 0x00, 0x3c, 0x00, 0x00, 0x00
                ]);
    connection.client.write(buf);
    
    response(OK);
}
/*
Connection.prototype.quit_respond = function(retval, msg) {
    var self = this;
    this.respond(221, msg || "closing connection. Have a jolly good day.", function() {
        self.disconnect();
    });
};

Connection.prototype.cmd_quit = function(args) {
    // RFC 5321 Section 4.3.2
    // QUIT does not accept arguments
    if (args) {
        return this.respond(501, "Syntax error");
    }
    plugins.run_hooks('quit', this);
};
*/
