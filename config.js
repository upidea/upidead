"use strict";
var configloader = require('./configfile');
var path         = require('path');
var logger       = require('./logger');
var fs           = require('fs');

var config = exports;

var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), 'utf8'));
var program = pkg.name.toUpperCase();

var config_path = process.env[program] ? path.join(process.env[program], 'config') : path.join(__dirname, './config');
config.get = function(name, type, cb) {
    if (type === 'nolog') {
        type = arguments[2]; // deprecated - TODO: remove later
    }

    type = type || 'value';
    var full_path = path.resolve(config_path, name);
    var results = configloader.read_config(full_path, type, cb); 
    
    // Pass arrays by value to prevent config being modified accidentally.
    if (Array.isArray(results)) {
        return results.slice();
    } 
    else {
        return results;
    }
};
