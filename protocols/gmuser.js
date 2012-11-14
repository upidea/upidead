/**
 * 命令字1， 创建GM帐号
 */
exports.handle_cmd_1 = function(packet_header, packet) {
	
	console.log("开始创建系统帐号了");
	this.logdebug("什么情况啊？？？");
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
