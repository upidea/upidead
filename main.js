#!/usr/bin/env node

"use strict";

var path = require('path');
var fs   = require('fs');

var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), 'utf8'));

exports.version = pkg.version;
exports.program = pkg.name.toUpperCase();

// this must be set before "server.js" is loaded
process.env[exports.program] = process.env[exports.program] || path.resolve('.');
try {
    // 对老版本做兼容， 新版本采用NODE_PATH而不是require.paths
    require.paths.push(path.join(process.env[exports.program], 'node_modules'));
}
catch(e) {
    process.env.NODE_PATH = process.env.NODE_PATH ? 
            (process.env.NODE_PATH + ':' + path.join(process.env[exports.program], 'node_modules'))
            :
            (path.join(process.env[exports.program], 'node_modules'));
    require('module')._initPaths(); // Horrible hack
}


var logger = require('./logger');
var server = require('./server');

process.on('uncaughtException', function (err) {
    if (err.stack) {
        err.stack.split("\n").forEach(function (line) {
            logger.logcrit(line);
        });
    }
    else {
        logger.logcrit('Caught exception: ' + err);
    }
    logger.dump_logs();
    process.exit(1);
});

logger.log("INFO", "Starting up " + exports.program + " version " + exports.version);

server.createServer();
