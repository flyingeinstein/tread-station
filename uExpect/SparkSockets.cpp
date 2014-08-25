#include "SparkSockets.h"

#include "sha1.h"
#include "Base64.h"

#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#define EMBEDDED_PROGRAM

#ifndef EMBEDDED_PROGRAM
#include "SparkSocketsProgram.h"
#else
extern const char* precompiled_program;
#endif

SparkSockets::SparkSockets(short bufferSize)
	: current_msg(NULL), onIncoming(NULL), protocol(ProtocolNotSpecified), ready(false), abort(false)
{
	buffer = (char*)malloc(bufferSize);
	expect.SetOutputBuffer(buffer, bufferSize);

	// set the callbacks
	expect.SetUserCallbackContext( this );
#ifdef WANT_RESOURCEURI
	expect.SetCallback(SET_RESOURCEURI, set_resourceuri);
#endif
#ifdef WANT_HOSTNAME
	expect.SetCallback(SET_HOSTNAME, set_hostname);
#endif
#ifdef WANT_ORIGIN
	expect.SetCallback(HTTP_ORIGIN, set_origin);
#endif

#ifdef WANT_USELESS
	expect.SetCallback(WS_CONNECTION, ws_connection);
#endif
	expect.SetCallback(WS_UPGRADE, ws_upgrade);
	expect.SetCallback(WS_SEC_KEY, ws_sec_key);
	expect.SetCallback(WS_SEC_PROTOCOL, ws_sec_protocol);
	expect.SetCallback(WS_SEC_VERSION, ws_sec_version);
	expect.SetCallback(WS_HSHAKE_REPLY, ws_respond);
	expect.SetCallback(WS_READ_HEADER, ws_read_header);
	expect.SetCallback(WS_DECODE_MESSAGE, ws_decode_message);

#ifndef EMBEDDED_PROGRAM
	uExpectBuilder builder;
	SparkSocketsProgram::Compile(builder);
	expect.Reset(builder.program, builder.length());
	//std::string code = builder.disassemble();
	//printf("CODE: %s\n", code.c_str());
#else
	expect.ResetStatic(precompiled_program);
#endif
}

SparkSockets::~SparkSockets()
{
}

void SparkSockets::Reset()
{
	ready = false;
	expect.Reset();
}

#ifdef WANT_RESOURCEURI
short SparkSockets::set_resourceuri(uExpect* pst, void* context)
{
	SparkSockets* spark = (SparkSockets*)context;
	strcpy(spark->resourceUri, pst->GetOutputBuffer());
	return 0;
}
#endif

#ifdef WANT_HOSTNAME
short SparkSockets::set_hostname(uExpect* pst, void* context)
{
	SparkSockets* spark = (SparkSockets*)context;
	strcpy(spark->hostname, pst->GetOutputBuffer());
	return 0;
}
#endif

#ifdef WANT_ORIGIN
short SparkSockets::set_origin(uExpect* pst, void* context)
{
	SparkSockets* spark = (SparkSockets*)context;
	strcpy(spark->origin, pst->GetOutputBuffer());
	return 0;
}
#endif

short SparkSockets::ws_upgrade(uExpect* pst, void* context)
{
	SparkSockets* spark = (SparkSockets*)context;
	spark->upgrade_websocket = true;
	return 0;
}

short SparkSockets::ws_sec_protocol(uExpect* pst, void* context)
{
	SparkSockets* spark = (SparkSockets*)context;
	const char* proto = pst->GetOutputBuffer();
#ifdef WANT_PROTOCOL
	strcpy(spark->protocolText, pst->GetOutputBuffer());
#endif
	if (strncmp("chat", proto, 4)==0)
		spark->protocol = SparkSockets::CHAT;
	else
		spark->protocol = ProtocolUnsupported;
	
	return 0;
}

short SparkSockets::ws_sec_version(uExpect* pst, void* context)
{
	SparkSockets* spark = (SparkSockets*)context;
	spark->securityVersion = atoi( pst->GetOutputBuffer() );
	return 0;
}

#ifdef WANT_USELESS
short SparkSockets::ws_connection(uExpect* pst, void* context)
{
	printf("CONNECTION\n");
	return 0;
}
#endif


short SparkSockets::ws_sec_key(uExpect* pst, void* context)
{
	SparkSockets* data = (SparkSockets*)context;
	strcpy(data->key, pst->GetOutputBuffer());
	return 0;
}

short SparkSockets::ws_respond(uExpect* pst, void* context)
{
	SparkSockets* spark = (SparkSockets*)context;
	const char* ws_magic_string = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

	if (spark->protocol == ProtocolUnsupported) {
		// respond that we don't know the requested protocol
		spark->write(
			"HTTP/1.1 403 Forbidden\r\n"
			"Sec-WebSocket-Protocol: chat\r\n\r\n"	// later we should allow the developer to choose this
			,-1);
		return 0;
	}

	// construct the response key
	char key[100];
	unsigned char sha[20];
	strcpy(key, spark->key);
	strcat(key, ws_magic_string);
	sha1((unsigned char*)key, strlen(key), sha );
	base64_encode(key, (char*)sha, sizeof(sha));

	// send the response
	char response[512];
	sprintf(response,
		"HTTP/1.1 101 Switching Protocols\r\n"
		"Upgrade: websocket\r\n"
		"Connection: Upgrade\r\n"
		"Sec-WebSocket-Accept: %s\r\n", key);
	if(spark->protocol == CHAT)
		strcat(response, "Sec-WebSocket-Protocol: chat\r\n");
	strcat(response, "\r\n");
	spark->write(response, -1);

	spark->ready = true;
	return 0;
}

short SparkSockets::sendText(const char* msg)
{
	unsigned char fin = 1;
	unsigned char opcode = 1;
	unsigned char masking_present = 0;
	uint16_t length = strlen(msg);
	
	// header
	char* buffer = (char*)malloc(length+ 10);
	char* p = buffer;
	*(uint16_t*)p = (fin << 7) | (opcode) | (masking_present << 15) | (length <<8);
	p+=2;

	// payload data
	memcpy(p, msg, length);
	p += length;
	*p++ = '\r';
	*p++ = '\n';

	write(buffer, p-buffer);
	return 0;
}

short SparkSockets::ws_read_header(uExpect* pst, void* context)
{
	SparkSockets* spark = (SparkSockets*)context;
	char* data = pst->GetOutputBuffer();
	char* end = data + pst->GetOutputLength();
	
	// must receive at least 2 bytes of header to start
	if (end-data <2) return 0;	// not enough header, wait for next byte(s)

	unsigned short frame = *(unsigned short*)data;
	char* msg = &data[2];
	bool fin = frame & 0x80;
	unsigned char opcode = (frame&0xf);
	bool mask_present = frame & 0x8000;
	uint32_t mask=0;
	
	// interpret the payload length
	int length = (frame & 0x7f00) >> 8; // shifted 9 times, or upper 7 bits of second byte
	if (length ==126) {
		// get two more bytes for the length
		length = *(unsigned short*)&data[2];
		msg+=2;
		if (msg > end) return 0;	// not enough header, wait for next byte(s)
	}
	else if (length == 127) {
#ifndef EMBEDDED_PROGRAM
		// get 6 more bytes for the length
		length = ((*(unsigned long long*)data) && ((1<<48) -1));
		msg+=6;
		if (msg > end) return 0;	// not enough header, wait for next byte(s)
#else
		// TODO: we really need to abort these!!! Our poor little micro wouldnt have this much memory. Possibly we could stream it in.
#endif
	}

	if (mask_present) {
		// read the mask key
		mask = *(uint32_t*)msg;
		msg += 4;
		if (msg > end) return 0;	// not enough header, wait for next byte(s)
	}

	// We've successfully received the header, now copy the details into a WS message header, 
	// then return the length so the uExpect program can capture the payload
	ws_message* ws;
	if(spark->current_msg==NULL)
		ws = spark->current_msg = new ws_message();
	else
		ws = spark->current_msg;
	ws->final = fin;
	ws->masking = mask_present;
	ws->mask = mask_present ? mask : 0;
	ws->opcode = opcode;
	ws->length = length;
	ws->data = NULL;

	// clear the output buffer so it will contain only the payload
	spark->expect.FlushOutput();

	return length;
}

short SparkSockets::ws_decode_message(uExpect* pst, void* context)
{
	SparkSockets* spark = (SparkSockets*)context;
	ws_message* msg = spark->current_msg;
	char* data = msg->data = pst->GetOutputBuffer();

	if (msg==NULL)
		return 0;

	// header done, now read the message
	if (msg->masking)
	{
		// decode the data
		unsigned char *p = (unsigned char*)data, *_p = (unsigned char*)data + msg->length;
		const unsigned char* key = (const unsigned char*)&msg->mask;	// alias mask back to an array of bytes
		int n=0;
		while (p < _p)
		{
			*p = *p ^ key[n];
			if(++n ==4)
				n=0;
			p++;
		}
	}
	data[msg->length]=0;
	msg->data = data;
	if (spark->onIncoming) {
		spark->onIncoming(spark, msg);
		delete msg;	// if user set's a handler, we can release the message now
		spark->current_msg = NULL;
	}
	return 0;
}


