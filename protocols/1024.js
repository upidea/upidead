var bufferpack  = require('bufferpack');
// protocol cmds 1024, �û����Э��

var cfg;

exports.register = function() {
    // ������register������һЩ���á�Ԥ��֮�������
}

// ���������ֱ���Э��ͷ�� Connections���� Э�����ݰ���(����8���ֽڵİ�ͷ)
exports.handle_1024 = function(response, connection, packet)
{
    // unpack(format, buffer, position)
    var packet_header = bufferpack.unpack('<B(ucFlag)H(usLen)B(ucCPkg)B(ucTPkg)H(ucCmd)B(ucSubCmd)', packet, 0);
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

