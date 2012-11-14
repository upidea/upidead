var constants   = require('../constants');

exports.handle_cmd_quit = function() {
	this.run_hooks('quit', this);
}

exports.response_cmd_quit = function(retval, msg) {
    var self = this;
    this.respond(221, msg || "closing connection. Have a jolly good day.", function() {
        self.disconnect();
    });
}

exports.handle_cmd_noop = function() {
	this.run_hooks('noop', this);
}

exports.response_cmd_noop = function(retval, msg) {
    var self = this;
    switch (retval) {
        case constants.deny:
                this.respond(500, msg || "Stop wasting my time");
                break;
        case constants.denydisconnect:
                this.respond(500, msg || "Stop wasting my time", function() {
                    self.disconnect();
                });
                break;
        default:
                this.respond(250, "OK");
    }
}

exports.handle_cmd_help = function() {
	this.respond(250, "Not implemented");
}
