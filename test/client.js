var cluster = require('cluster');
var net = require('net');
var hexy = require('hexy');

var HOST = '127.0.0.1';
var PORT = 2525;

var client = new net.Socket();
client.connect(PORT, HOST, function() {

    console.log('CONNECTED TO: ' + HOST + ':' + PORT);
    // 建立连接后立即向服务器发送数据，服务器将收到这些数据 
    // client.write('I am Chuck Norris!');
/*
    var r1 = new Buffer(2048);
    var pos = 0;
    r1.writeUInt16LE(0x0102, pos);
    pos += 2;
    r1.writeUInt32LE(0x03040506, pos);
    client.write(r1.slice(0, 6));
    
    var packet_header = bufferpack.unpack('<B(ucFlag)H(usLen)B(ucCPkg)B(ucTPkg)H(usCmd)B(ucSubCmd)', line, 0);
    
*/
        var buf2 = new Buffer([ 
        0x60, 0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00, // header
        0x7a, 0x32, 0x00, 0x00  // one int
        ]);
        client.write(buf2);
    
});
    

// 为客户端添加“data”事件处理函数
// data是服务器发回的数据
client.on('data', function(data) {

    console.log('DATA:');
    console.log(hexy.hexy(data));
    console.log('===============================');
    
    if(data[0] == 0x181)
    {
        console.log("找个理由退出");
        console.log(hexy.hexy(new Buffer("~quit\r\n")));
        client.write(new Buffer("~quit\r\n"));
    }
    else
    {
        var buf2 = new Buffer([ 
        0x60, 0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00, // header
        0x7a, 0x32, 0x00, 0x00  // one int
        ]);
        client.write(buf2);

    }
    
});

// 为客户端添加“close”事件处理函数
client.on('close', function() {
    console.log('Connection closed');
});



