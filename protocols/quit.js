// protocol cmds 1024, �û����Э��

var cfg;

exports.register = function() {
    // ������register������һЩ���á�Ԥ��֮�������
}

// ���������ֱ���Э��ͷ�� Connections���� Э�����ݰ���(����8���ֽڵİ�ͷ)
exports.handle_quit = function(response, connection, packet_header, packet)
{
    // ���
    // ���ݴ���
    // ����Ӧ��
    
/*****
    �ο�response
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
