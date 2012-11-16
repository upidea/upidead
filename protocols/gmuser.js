var bufferpack = require('bufferpack');

/**
 * 命令字1， 创建GM帐号
 */
exports.handle_cmd_1 = function(packet_header, packet) {
/**
c struct:
		char	m_szName[64];		// 角色名称
		char	m_szPassword[64];	// 密码
		char	m_szRealName[64];   // 所有人姓名
		char	m_szDescript[128];  // 备注
**/	
	var y = bufferpack.unpack('>64A(name)64A(passwd)64A(realname)128A(desc)', packet, 8);
	
	sql = "insert into gm_account (UsrName, UsrPswd, Level, RealName, Descript ) values ('"
		+ y.name.toString().replace(/([\0]*$)/g, "")
		+ "', '"
		+ y.passwd.toString().replace(/([\0]*$)/g, "")
		+ "', 0, '"
		+ y.realname.toString().replace(/([\0]*$)/g, "")
		+ "', '"
		+ y.desc.toString().replace(/([\0]*$)/g, "")
		+ "')";

console.log(sql);
console.log(this.server.db);

	this.server.db.query(sql, [],
		function(err, results)
		{
			if (err) {
				console.log('error fetching some active users: ' + err);
				return;
			}
	
			for (var i = 0; i < results.length; i++)
				console.log('got active user ' + results[i]);
		});
	
	
/***
	var mysql      = require('mysql');
	var connection = mysql.createConnection({
  		host     : 'localhost',
  		user     : 'root',
  		password : 'huoyan',
  		charset	 : 'utf8',
  		database : 'jiang_gm'
	});

	connection.connect();

	sql = "insert into gm_account (UsrName, UsrPswd, Level, RealName, Descript ) values ('"
		+ y.name.toString().replace(/([\0]*$)/g, "")
		+ "', '"
		+ y.passwd.toString().replace(/([\0]*$)/g, "")
		+ "', 0, '"
		+ y.realname.toString().replace(/([\0]*$)/g, "")
		+ "', '"
		+ y.desc.toString().replace(/([\0]*$)/g, "")
		+ "')";

	console.log(sql);		

	connection.query(sql, function(err, rows, fields) {
  		// if (err) throw err;
		console.log(err);
		console.log(rows);
		console.log(fields);
	});


	connection.query("select * from gm_account", function(err, rows, fields) {
  		// if (err) throw err;
		// console.log(err);
		// console.log(rows);
		rows.forEach(function(row){
			console.log(row);
		});
		// console.log(fields);
	});


	connection.end();
***/

/**
	// 修改数据库表的字符集
	// alter table review convert to character set utf8;
	
	var db = require("mysql-native").createTCPClient(); // localhost:3306 by default
	// var db = require("mysql-native").createUNIXClient('/var/run/mysql/mysql.sock'); // localhost:3306 by default
	db.auto_prepare = true;
	db.auth("jiang_gm", "root", "huoyan");

	sql = "insert into gm_account (UsrName, UsrPswd, Level, RealName, Descript ) values ('"
		+ y.name.toString().replace(/([\0]*$)/g, "")
		+ "', '"
		+ y.passwd.toString().replace(/([\0]*$)/g, "")
		+ "', 0, '"
		+ y.realname.toString().replace(/([\0]*$)/g, "")
		+ "', '"
		+ y.desc.toString().replace(/([\0]*$)/g, "")
		+ "')";
	db.execute(sql, []);
    console.log(sql);

	// 这个replace太恶心了， 但是由于反解不开， 暂时先这样了
*
	db.execute("insert into gm_account (UsrName, UsrPswd, Level, RealName, Descript ) values (_gbk ?, _gbk ?, 0, _gbk ?, _gbk ?)", 
	 	[y.passwd.toString().replace(/([\0]*$)/g, ""), 
	 	y.passwd.toString().replace(/([\0]*$)/g, ""), 
	 	y.realname.toString().replace(/([\0]*$)/g, ""), 
	 	y.desc.toString().replace(/([\0]*$)/g, "")]);
*	 	

	// db.execute("insert into gm_account (UsrName, UsrPswd, Level, RealName, Descript ) values ('aaa', 'bbb', 0, _gbk 'cccc', _gbk 'dddd')", []); 
	db.close();
	
***/	

	this.respond(1, "应该用0来返回2禁止数据啦， 这里只是测试");
}

/**
exports.response_cmd_1 = function(retval, msg) {
    var self = this;
    this.respond(221, msg || "closing connection. Have a jolly good day.", function() {
        self.disconnect();
    });
}
**/


/**
 * 命令字2， 删除指定GM帐号
 */
exports.handle_cmd_2 = function(packet_header, packet) {
/**
c struct:
		char	m_szName[64];		// 角色名称
**/	
	var y = bufferpack.unpack('>64A(name)', packet, 8);
	
	var mysql      = require('mysql');
	var connection = mysql.createConnection({
  		host     : 'localhost',
  		user     : 'root',
  		password : 'huoyan',
  		charset	 : 'utf8',
  		database : 'jiang_gm'
	});

	connection.connect();

	sql = "delete from gm_account where UsrName = '"
		+ y.name.toString().replace(/([\0]*$)/g, "")
		+ "'";
	console.log(sql);		

	connection.query(sql, function(err, rows, fields) {
  		// if (err) throw err;
		console.log(err);
		console.log(rows);
		console.log(fields);
	});

	connection.end();

	this.respond(1, "应该用0来返回2禁止数据啦， 这里只是测试");
}

/**
exports.response_cmd_1 = function(retval, msg) {
    var self = this;
    this.respond(221, msg || "closing connection. Have a jolly good day.", function() {
        self.disconnect();
    });
}
**/

/**
 * 命令字3， 查看指定GM帐号
 */
exports.handle_cmd_3 = function(packet_header, packet) {
/**
c struct:
		char	m_szName[64];		// 角色名称
**/	
	var y = bufferpack.unpack('>64A(name)', packet, 8);
	
	var mysql      = require('mysql');
	var connection = mysql.createConnection({
  		host     : 'localhost',
  		user     : 'root',
  		password : 'huoyan',
  		charset	 : 'utf8',
  		database : 'jiang_gm'
	});

	connection.connect();

	// 查询名为空时列出全部帐号
	sql = "select * from gm_account where UsrName = '"
		+ y.name.toString().replace(/([\0]*$)/g, "")
		+ "'";
	console.log(sql);		

	connection.query(sql, function(err, rows, fields) {
  		// if (err) throw err;
		console.log(err);
		console.log(rows);
		console.log(fields);
	});

	connection.end();

	this.respond(1, "应该用0来返回2禁止数据啦， 这里只是测试");
}

/**
exports.response_cmd_1 = function(retval, msg) {
    var self = this;
    this.respond(221, msg || "closing connection. Have a jolly good day.", function() {
        self.disconnect();
    });
}
**/

/**
 * 命令字3， 设置用户权限字
 */
exports.handle_cmd_3 = function(packet_header, packet) {
/**
c struct:
		char m_name[64];
		u32bit m_allowId[64];
**/	
	var y = bufferpack.unpack('>64A(name)', packet, 8);
	
	var mysql      = require('mysql');
	var connection = mysql.createConnection({
  		host     : 'localhost',
  		user     : 'root',
  		password : 'huoyan',
  		charset	 : 'utf8',
  		database : 'jiang_gm'
	});

	connection.connect();

/*
	string strSave = "update gm_account set PermitionFlag  = BINARY '";
	string strBinary;
	DBField::ConvertBinaryString(permissionFlag, 1024, strBinary);
	strSave += strBinary;
	strSave += "'";
	strSave += " where UsrName = _gbk '";
	strSave += "%s";
	strSave += "'";
*/

	// 查询名为空时列出全部帐号
	sql = "select * from gm_account where UsrName = '"
		+ y.name.toString().replace(/([\0]*$)/g, "")
		+ "'";
	console.log(sql);		

	connection.query(sql, function(err, rows, fields) {
  		// if (err) throw err;
		console.log(err);
		console.log(rows);
		console.log(fields);
	});

	connection.end();

	this.respond(1, "应该用0来返回2禁止数据啦， 这里只是测试");
}

/**
exports.response_cmd_1 = function(retval, msg) {
    var self = this;
    this.respond(221, msg || "closing connection. Have a jolly good day.", function() {
        self.disconnect();
    });
}
**/

