


	var md5 	   = require('MD5');
	var mysql      = require('mysql');
	var connection = mysql.createConnection({
  		host     : 'localhost',
  		user     : 'root',
  		password : 'huoyan',
  		charset	 : 'utf8',
  		database : 'jiang_gm'
	});

	connection.connect();

	y = {};
	y.name="name";
	y.passwd = md5('123');
	y.realname = "王某某";
	y.desc = "芊羽他爹";
	
/*
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
*/
	var query = connection.query("insert into gm_account (UsrName, UsrPswd, Level, RealName, Descript ) values (?, ?, 0, ?, ?)", 
		[y.name, y.passwd, y.realname, y.desc], 
		function(err, result) {
	  		if (err) {
	  			console.log(result);
	  		}
	  		else {
	  		}
			
		});
	console.log(query.sql);
	

/*
	connection.query("select * from gm_account", function(err, rows, fields) {
  		// if (err) throw err;
		// console.log(err);
		// console.log(rows);
		rows.forEach(function(row){
			console.log(row);
		});
		// console.log(fields);
	});
*/

	connection.end();
