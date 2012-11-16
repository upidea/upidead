var poolModule = require('generic-pool');
var mysql = require('mysql');

var pool = null;

/**
 * Initialize the MySQL connection pool with the given database details.
 */
exports.init = function(dbUser, dbPass, dbDatabase, dbCharset, dbHost, dbPort) {
  pool = poolModule.Pool({
    name : 'mysql',
    create : function(callback) {
/*
      var Client = mysql.Client;
      var c = new Client();
      if (dbUser) c.user = dbUser;
      if (dbPass) c.password = dbPass;
      if (dbDatabase) c.database = dbDatabase;
      if (dbCharset) c.charset = dbCharset;
      if (dbHost) c.host = dbHost;
      if (dbPort) c.port = dbPort;      
      
      callback(null, c);
*/
		var connection = require('mysql').createConnection({
	  		host     : 'localhost',
	  		user     : 'root',
	  		password : 'huoyan',
	  		charset	 : 'utf8',
	  		database : 'jiang_gm'
		});
		connection.connect();
		callback(null, connection);      
    },
    destroy : function(client) {
      if (client.connected) {
        try { client.end(); }
        catch (err) { console.error('Failed to close MySQL connection: ' + err); }
      }
    },
    max : 50,
    min : 2, 
    idleTimeoutMillis : 30000,
    log: true
  });
};

/**
 * 程序中如果要放弃pool的使用，需要主动调用这个函数释放Pool
 */
exports.destory = function() {
	pool.drain(function() {
	    pool.destroyAllNow();
	});
};

/**
 * Execute a query that is expected to return zero or more rows.
 * @param {string} query SQL query to execute
 * @param {Array.<Object>} data Parameters to substitute into the query
 * @param {function(string, Array.<Object>)} callback Callback to execute when
 *        the query completes
 */
exports.query = function(query, data, callback) {
  pool.acquire(function(err, client) {
    if (!err) {
      client.query(query, data, function(err1, results, fields) {
        try { callback(err1, results); }
        finally { pool.release(client); }
      });
    } else {
    	console.log("I don't know what to do when acquire failed.");
    };
  });
};

/**
 * Execute a query that is expected to return zero or one rows.
 */
exports.querySingle = function(query, data, callback) {
  pool.acquire(function(err1, client) {
  	if(!err1)
  	{
      client.query(query, data, function(err, results, fields) {
        try { callback(err, (results && results.length > 0) ? results[0] : null); }
        finally { pool.release(client); }
      });
    } else {
    	console.log("I don't know what to do when acquire failed.");
    };
  });
};

/**
 * Execute a query that is expected to return many rows, and stream the results
 * back one row at a time.
 */
exports.queryMany = function(query, data, rowCallback, endCallback) {
  pool.acquire(function(err1, client) {
  	if(!err1)
  	{
      client.query(query, data)
        .on('error', function(err) {
          try { if (endCallback) endCallback(err); }
          finally { pool.release(client); }
        })
        .on('row', rowCallback)
        .on('end', function() {
          try { if (endCallback) endCallback(null); }
          finally { pool.release(client); }
        });
    } else {
    	console.log("I don't know what to do when acquire failed.");
    };
  });
};

/**
 * Execute a query that is not expected to return any rows.
 */
exports.nonQuery = function(query, data, callback) {
  pool.acquire(function(err1, client) {
  	if(!err1)
  	{
      client.query(query, data, function(err, info) {
        try { if (callback) callback(err, info); }
        finally { pool.release(client); }
      });
    } else {
    	console.log("I don't know what to do when acquire failed.");
    };
  });
};
