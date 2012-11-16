var cluster = require('cluster');
var net = require('net');
var hexy = require('hexy');
var bufferpack = require('bufferpack');


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
        /*
        char    m_szName[64];       // 角色名称
        char    m_szPassword[64];   // 密码
        char    m_szRealName[64];   // 所有人姓名
        char    m_szDescript[128];  // 备注
        */
/*
    var r1 = new Buffer(2048);
    var pos = 0;
    r1.writeUInt16LE(0x0102, pos);
    pos += 2;
    r1.writeUInt32LE(0x03040506, pos);
    client.write(r1.slice(0, 6));
*/
	var r1 = new Buffer(2048);
	r1.fill(0);
    var x = bufferpack.packTo(">BHBBHB",  r1,  0, [0x60, 64+64+64+128, 1, 1, 1, 0]);      
    var x = bufferpack.packTo(">64A64A64A128A", r1, 8, [new  Buffer("角色名称"), new Buffer("密码"), new Buffer("所有人姓名"), new Buffer("备注")]);
/*
    r1.write("角色名称", 8);
    r1.write("密码", 8+64);
    r1.write("所有人姓名", 8+64+64);
    r1.write("备注", 8+64+64+64);
*/    
    console.log(hexy.hexy(r1.slice(0, 8+64+64+64+128)));
/*    
    // process.exit();
    
    // console.log( r1.toString("utf8", 8, 8+64) );
	var y = bufferpack.unpack('>64A(name)64A(passwd)64A(realname)128A(desc)', r1, 8);
	
	var StringDecoder = require('string_decoder').StringDecoder;
	var decoder = new StringDecoder('utf8');
	
	

	
	sql = "insert into gm_account (UsrName, UsrPswd, Level, RealName, Descript ) values ('"
		+ decoder.write(y.name)
		+ "', '"
		+ y.passwd.toString().replace(/([\s]*$)/g, "")
		+ "', 0, _gbk '"
		+ y.realname.toString().replace(/([\s]*$)/g, "")
		+ "', _gbk '"
		+ y.desc.toString().replace(/([\s]*$)/g, "")
		+ "')";
    console.log(sql);
    console.log(hexy.hexy(new Buffer(y.passwd.toString())));
    
    
    var x = new Buffer(64);
    x.fill(0);
x.write("问题", 0);
console.log(hexy.hexy(x));
console.log('B'+x.toString().replace(/([\0]*$)/g, "")+'D');



    process.exit();
*/    
    
/*
    var y = bufferpack.unpack('>64S(ucFlag)', r1, 8);
    console.log('菜'+y.ucFlag.toString());
    console.log(hexy.hexy(y.ucFlag));
    
    
    process.exit();
*/    

    
/*
    process.exit();


        var buf2 = new Buffer([ 
        0x60, 0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00, // header
        0x7a, 0x32, 0x00, 0x00  // one int
        ]);
*/            
        client.write(r1.slice(0, 8+64+64+64+128));
    
});
    

// 为客户端添加“data”事件处理函数
// data是服务器发回的数据
client.on('data', function(data) {

    console.log('DATA:');
    console.log(hexy.hexy(data));
    console.log('===============================');
    
    if(data[0] == 0x60)
    {
        console.log("找个理由退出");
        console.log(hexy.hexy(new Buffer("~quit\r\n")));
        client.write(new Buffer("~quit\r\n"));
    }
    else
    {
    	/*
        var buf2 = new Buffer([ 
        0x60, 0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00, // header
        0x7a, 0x32, 0x00, 0x00  // one int
        ]);
        client.write(buf2);
        */

    }
    
});

// 为客户端添加“close”事件处理函数
client.on('close', function() {
    console.log('Connection closed');
});





