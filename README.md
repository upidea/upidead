UISRVD - a Node.js binary socket Server framework
------------------------------

	参与webgame开发中， 尝试使用nodejs代替c++编写webgame的server， 采用自定义二进制协议。
	

### 欢迎参与
	
	欢迎参与开发和交流， QQ群：24804487

### 开发资料
	
	当前特性：
		同时支持二进制协议和文本协议
			文本协议： 		~cmd param1 param2 ...， 例如 ~help, ~quit
			二进制协议： 	 var packet_header = bufferpack.unpack('<B(ucFlag)H(usLen)B(ucCPkg)B(ucTPkg)H(ucCmd)B(ucSubCmd)', packet, 0);
				ucFlag为`，固定值， 用于标识二进制协议
				usLen 16bit的数据包长度
				ucCPkg 序列包的当前包数 
				ucTPkg 序列包的总包数
				ucCmd  主命令字， 16bit
				ucSubCmd 字命令字, 8bit
		配置文件
			支持多种配置文件， 详细文档参考Haraka的相关文档
		日志
			logdebug ...等， 具体参看logger.js

	TODO:
		协议注册方式感觉不爽，虽然保留了Haraka的plugins机制， 但是协议扩充本身的方法，感觉增减协议不够智能， 而且怀疑有数据拷贝和内存效率的问题
		尚未验证二进制协议
		...
		
		