
#include "SparkSocketsProgram.h"
#include "SparkSockets.h"

SparkSocketsProgram::SparkSocketsProgram()
{
}


SparkSocketsProgram::~SparkSocketsProgram()
{
}

	// the state machine
int SparkSocketsProgram::Compile(uExpectBuilder& builder)
{
	// get the Resource URI from a http GET request
	//st.Reset("\x1b\x41\x62GET \x1b\x40\x04 \x04\0\x60\x08\xf9\x03\0\x41\x62 HTTP/1.1\n\x64\x0\x1");
	builder
		.oe(false)
		.exportLabel("idle")
		.exportLabel("read_post")
	// expect the GET header
		.expect("GET ")
		.accept_until(' ')
		.expect("HTTP/1.1\r\n")
		.call(SparkSockets::SET_RESOURCEURI)
	// begin reading any post name/value pairs (there should be some)
	.mark("read_post")
		// todo, I could probably write a single function that would match on any number of strings and make this easier than wrote coding
		.flush()	// clear output buffer
		.begin_switchl()	// long jump switch
			.when('H', "expect_host")
			.when('U', "expect_u_var")
			.when('C', "expect_c_var")
			.when('O', "expect_origin")
			.when('S', "expect_sec-websocket-")
			.when('\r', "end_of_post")
		.end_switch()
		// unknown post name/value pair, just ignore
		// we got lots of variables like Pragma, Cache-Control, User-Agent,Cookie
		//.stop(SparkSockets::ABORT_CONNECTION)		// maybe just a print would be handy here
		//.stop()
		.ignore_until("\r\n")
		.jumpl("read_post")
	// name starts with C
	.mark("expect_c_var")
		.read()
		.jump_if('o', "expect_co_var")
		.ignore_until("\r\n")
		.jumpl("read_post")
	.mark("expect_co_var")
		.read()
		.jump_if('n', "expect_connection")
		.ignore_until("\r\n")
		.jumpl("read_post")

	.mark("expect_u_var")
		.read()
		.jump_if('p', "expect_upgrade")
		.ignore_until("\r\n")
		.jumpl("read_post")
		
	// handshake done
	.mark("end_of_post")
		.expect("\r\n")
		.jumpl("begin_handshake")
	// match on known post variable
	.mark("expect_host")
		.expect("Host: ")
		.accept_until("\r\n")
		.call(SparkSockets::SET_HOSTNAME)
		.jumpl("read_post")
	.mark("expect_upgrade")
		.expect("pgrade: websocket\r\n")
		.call(SparkSockets::WS_UPGRADE)
		.jumpl("read_post")
	.mark("expect_connection")
		.expect("nnection: Upgrade\r\n")
		.call(SparkSockets::WS_CONNECTION)
		.jumpl("read_post")
	.mark("expect_origin")
		.expect("Origin: ")
		.accept_until("\r\n")
		.call(SparkSockets::HTTP_ORIGIN)
		.jumpl("read_post")
	.mark("expect_sec-websocket-")
		.expect("Sec-WebSocket-")
		.begin_switch()
			.when('K', "expect_sec_key")
			.when('P', "expect_sec_protocol")
			.when('V', "expect_sec_version")
			.when('E', "expect_sec_extensions")
		.end_switch()
		.stop(SparkSockets::WS_SEC_UNKNOWN)
	.mark("expect_sec_key")	// matching Sec-WebSocket-Key
		.expect("Key: ")
		.accept_until("\r\n")
		.call(SparkSockets::WS_SEC_KEY)
		.jumpl("read_post")
	.mark("expect_sec_protocol")	// matching Sec-WebSocket-Protocol
		.expect("Protocol: ")
		.accept_until("\r\n")
		.call(SparkSockets::WS_SEC_PROTOCOL)
		.jumpl("read_post")
	.mark("expect_sec_version")	// matching Sec-WebSocket-Version
		.expect("Version: ")
		.accept_until("\r\n")
		.call(SparkSockets::WS_SEC_VERSION)
		.jumpl("read_post")
	.mark("expect_sec_extensions")	// matching Sec-WebSocket-Extensions
		.expect("Extensions: ")
		.accept_until("\r\n")
		.call(SparkSockets::WS_SEC_EXTENSIONS)
		.jumpl("read_post")
	.mark("begin_handshake")
		.call(SparkSockets::WS_HSHAKE_REPLY)
	// from this point we are connected and idle
	.mark("idle")
		.stop(SparkSockets::WS_IDLE)
		.flush()	// clear output buffer
	.mark("expect_header")
		.accept()
		.calljz(SparkSockets::WS_READ_HEADER, "expect_header")
		// got a header, payload length is in the input register now
		.ldi()	// transfer value in input to the working register
	.mark("read_payload")
		.accept()
		.dec_jnz("read_payload")
		.output(0)
		.call(SparkSockets::WS_DECODE_MESSAGE)
		.jump("idle")
		.end_program()
		;
	return 0;
}
