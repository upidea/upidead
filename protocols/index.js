var fs          = require('fs');

fs.readdirSync(__dirname).forEach(function(file){
	var cmds = require('./' + file);
	for (var cmd in cmds) {
		console.log(cmd);
	  	if(/^(?:handle_cmd_|response_cmd_)\w/.test(cmd))
	  	{
	    	exports[cmd] = cmds[cmd];
	    }
	}
});

// for test
// console.log(exports);
