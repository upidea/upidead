UISRVD - a Node.js binary socket Server framework
------------------------------

	����webgame�����У� ����ʹ��nodejs����c++��дwebgame��server�� �����Զ��������Э�顣
	

### ��ӭ����
	
	��ӭ���뿪���ͽ����� QQȺ��24804487

### ��������
	
	��ǰ���ԣ�
		ͬʱ֧�ֶ�����Э����ı�Э��
			�ı�Э�飺 		~cmd param1 param2 ...�� ���� ~help, ~quit
			������Э�飺 	 var packet_header = bufferpack.unpack('<B(ucFlag)H(usLen)B(ucCPkg)B(ucTPkg)H(ucCmd)B(ucSubCmd)', packet, 0);
				ucFlagΪ`���̶�ֵ�� ���ڱ�ʶ������Э��
				usLen 16bit�����ݰ�����
				ucCPkg ���а��ĵ�ǰ���� 
				ucTPkg ���а����ܰ���
				ucCmd  �������֣� 16bit
				ucSubCmd ��������, 8bit
		�����ļ�
			֧�ֶ��������ļ��� ��ϸ�ĵ��ο�Haraka������ĵ�
		��־
			logdebug ...�ȣ� ����ο�logger.js

	TODO:
		Э��ע�᷽ʽ�о���ˬ����Ȼ������Haraka��plugins���ƣ� ����Э�����䱾��ķ������о�����Э�鲻�����ܣ� ���һ��������ݿ������ڴ�Ч�ʵ�����
		��δ��֤������Э��
		...
		
		