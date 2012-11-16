// Create a MySQL connection pool with
// a max of 10 connections, a min of 2, and a 30 second max idle time
var poolModule = require('generic-pool');
var pool = poolModule.Pool({
    name     : 'mysql',
    create   : function(callback) {
		var connection = require('mysql').createConnection({
	  		host     : 'localhost',
	  		user     : 'root',
	  		password : 'huoyan',
	  		charset	 : 'utf8',
	  		database : 'jiang_gm'
		});
		// connection.connect();
	
        // parameter order: err, resource
        // new in 1.0.6
        callback(null, connection);
    },
    destroy  : function(client) { client.end(); },
    max      : 10,
    // optional. if you set this, make sure to drain() (see step 3)
    min      : 2, 
    // specifies how long a resource can stay idle in pool before being removed
    idleTimeoutMillis : 30000,
     // if true, logs via console.log - can also be a function
    log : true 
});


// acquire connection - callback function is called
// once a resource becomes available
pool.acquire(function(err, client) {
    if (err) {
        // handle error - this is generally the err from your
        // factory.create function  
        console.log("===================acquire error =============");
        console.log(err);
    }
    else {
    	// console.log(client);

        client.query("select * from gm_account", [], function(err1, result) {
        	if(!err1)
        	{
        		console.log(result);


	            // return object back to pool
	            pool.release(client);
        	} else {
        		// 需要查看资料查询这个状态下是否要返还pool
        	}
        });

    }
});

// 推出程序。。。
pool.drain(function() {
    pool.destroyAllNow();
});
