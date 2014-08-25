#ifndef __SPARK_SOCKETS_H
#define __SPARK_SOCKETS_H

#include "uExpect.h"

// define any of these that you would like to keep during handshaking
// for microcontrollers it's best to limit to only what you use to save memory.
//#define WANT_RESOURCEURI
//#define WANT_HOSTNAME
//#define WANT_ORIGIN
//#define WANT_PROTOCOL
//#define WANT_USELESS		// really only valid for debugging, these fields are usually always the same

// if defined, use the embedded program instead of compiling on demand
// this should be defined when you embed SparkSockets into your micro-controller.
//#define EMBEDDED_PROGRAM

/**** Web Sockets sample framework
 ****/

#define WS_OPCODE_CONTINUATION		0
#define WS_OPCODE_TEXT				1
#define WS_OPCODE_BINARY			2
#define WS_OPCODE_CONNECTION_CLOSE	8
#define WS_OPCODE_PING				9
#define WS_OPCODE_PONG				10


/*** WebSocket Message 
 *
 *  This class is used to return a received web socket message to the main user code.
 *  You probably only care about the length and data members, but possibly the opcode if you want
 *  to differentiate binary from text messages.
 */
typedef struct _ws_message {
	bool final;				// marks this is the final message chunk (also true if it is the only one)
	unsigned char opcode;	// one of WS_OPCODE_xxxxx
	bool masking;			// true if the payload is masked
	uint32_t mask;			// the mask key
	short length;			// payload length
	char* data;				// payload data
} ws_message;


class SparkSockets
{
protected:
	char* buffer;
	ws_message* current_msg;

public:
	uExpect expect;

	SparkSockets(short bufferSize);
	~SparkSockets();

	void Reset();

	typedef short(*incoming_message_handler)(SparkSockets* spark, ws_message* msg);


	// simply delegate processing to uExpect
	inline int Process(char input) { return expect.Process(input); }
	inline const char* Process(const char* input, int* result) { return expect.Process(input, result); }
	inline const char* Process(const char* input, int length, int* result) { return expect.Process(input, length, result); }

	inline void write(const char* str, int length) { expect.__write(expect.write_context, str, length); }

	// send a web socket text message to the client
	short sendText(const char* msg);

	incoming_message_handler onIncoming;


	enum ProtocolID { ProtocolNotSpecified, ProtocolUnsupported, CHAT };

	enum CallbackID {
		SET_RESOURCEURI=1,
		SET_HOSTNAME,
		WS_UPGRADE,
		WS_CONNECTION,
		WS_SEC_KEY,
		WS_SEC_PROTOCOL,
		WS_SEC_VERSION,
		WS_SEC_EXTENSIONS,
		WS_SEC_UNKNOWN,
		HTTP_ORIGIN,
		ABORT_CONNECTION,
		WS_HSHAKE_REPLY,
		WS_IDLE,
		WS_READ_HEADER,
		WS_DECODE_MESSAGE
	};

	// callback functions
	static short ws_upgrade(uExpect* pst, void* context);
	static short ws_sec_version(uExpect* pst, void* context);
	static short ws_sec_protocol(uExpect* pst, void* context);
	static short ws_connection(uExpect* pst, void* context);
	static short ws_sec_key(uExpect* pst, void* context);
	static short ws_respond(uExpect* pst, void* context);
	static short ws_read_header(uExpect* pst, void* context);
	static short ws_decode_message(uExpect* pst, void* context);
	

	// optional fields
#ifdef WANT_RESOURCEURI
	char resourceUri[60];
	static short set_resourceuri(uExpect* pst, void* context);
#endif
#ifdef WANT_HOSTNAME
	char hostname[60];
	static short set_hostname(uExpect* pst, void* context);
#endif
#ifdef WANT_ORIGIN
	char origin[60];
	static short set_origin(uExpect* pst, void* context);
#endif
#ifdef WANT_PROTOCOL
	char protocolText[60];	// if not kept here, is still available parsed into ProtocolID
#endif

	bool upgrade_websocket;
	short securityVersion;
	char key[30];
	ProtocolID protocol;

	bool ready;	// true of the handshaking phase is complete
	bool abort;
};

#endif // __SPARK_SOCKETS_H
