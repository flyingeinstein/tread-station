#ifndef __UEXPECT_H
#define __UEXPECT_H

// define if you want to include the code that can build suffix trees
// typically you would enable this on a desktop machine to generate
// your trees, then not enable in your Arduino or Spark project.
//#define BUILDABLE

#include <stdint.h>
#include <map>

// if not defined, all opcodes and memory related to a stack are removed 
// not all uExpect programs need a stack an removing it can save memory and program space
//#define HAS_STACK

// if defined, the executer can switch context from one uExpect program to another
// this allows more sophisticated multi-level programs such as the WebSockets program which then
// calls into a second program that parses the messages themselves.
//#define HAS_CONTEXT

// if we have a stack size, what size is it?
#define STACK_SIZE 8

/*
             _/_/_/_/                                            _/      
  _/    _/  _/        _/    _/  _/_/_/      _/_/      _/_/_/  _/_/_/_/   
 _/    _/  _/_/_/      _/_/    _/    _/  _/_/_/_/  _/          _/        
_/    _/  _/        _/    _/  _/    _/  _/        _/          _/         
 _/_/_/  _/_/_/_/  _/    _/  _/_/_/      _/_/_/    _/_/_/      _/_/      
                            _/                                           
                           _/                                                      

  HOW TO USE

  Do not get to involved with the contents of this file It simply takes a program encoded as a string, then allows you
  pass in a character at a time as input to the program. THe program will return ST_STOP when it is complete. The program 
  output comes in the form of the output buffer or can use the callbacks to call back into your user code.

  // To get started simply pass in the program text:
  uExpect prg(my_program_text);

  // Then pass in characters as you read them
  while(1) {
    char c = read();
	if(prg.Process(c) == ST_STOP) {
	  // do something with prg.GetOutputBuffer();
	}
  }
  
  // if you really want to get fancy, you can set a callback. callbacks are called in the text program with opcode CALL <int>
  // you then set the callback after you call the constructor. For example, we can attach a function to state 5...
  short my_func(uExpect* pst, void* context) { printf("%s\n", pst->GetOutputBuffer()); }

  uExpect prg(my_program_text);
  prg.SetCallback(5, my_func);

  If you use the callback functions wisely you can implement a neat state machine that detects/parses input sentences and calls
  specific functions as each part is parsed. See the websockets.io as an example of this. It even uses a callback to compute the
  response security token and callbacks to output the response security handshake.

  Use the uExpectBuilder class or the assembler tool to build the text program. Again, see the websockets.io for examples.

 * desired features
 *   (1) Create a flex/bison compiler
 *          (a) simply calls .<opcode>() methods on uExpectBuilder()
 *          (b) implements callbacks as embedded code blocks using { and } syntax. will use anonymous function name, or you can specify a name using "my_proc_name => { ... }"
 *          (c) outputs the compiler results as a C file (and/or header?)
 *          (d) has nice syntax for switch statements
 *          (e) has nice syntax for combining multiple strings into a suffix parse tree sub-program
 *   (2) Test Development Environment
 *          I like the idea of having an editor where you can run the program and either connect the IO to a serial port, a 
 *          tcp/ip port, or to predetermined script - which could be just another uExpect script....hmmm. This would test all
 *          the input aspects of the microcontroller code!
 */

#define ST_NEXT			0
#define ST_STOP			1
#define ST_FAIL			-1
#define ST_IGNORED		-2
#define ST_BAD_PROGRAM	-3

// opcode bits can represent certain groups of codes with special properties
#define OPBIT_REQ_INPUT			(1<<7)		// instruction requires an input character to be in the buffer
											// if no input character exists then the program yields control back to the main app
#define OPBIT_SWALLOWS			(1<<6)		// instruction eats the input and execution can only continue so long as instructions do not require input
//#define OPBIT_CONTINUATION		(1<<4)		// instruction may run over multiple cycles, such as a PRINTS (print string)

// interpreter opcodes
#ifdef HAS_STACK
#define OPCODE_PUSH				(0x01)	// push input or W to stack?
#endif

#define OPCODE_VCALL			(0x04)
#define OPCODE_VCALLJZ			(0x05)
#define OPCODE_VCALLJNZ			(0x06)
#define OPCODE_VCALLX			(0x07)
#define OPCODE_RETURN			(0x08)
#define OPCODE_JUMP8			(0x09)
#define OPCODE_JUMP16			(0x0a)
#define OPCODE_JUMP_IF			(0x0b|OPBIT_REQ_INPUT)
#define OPCODE_JUMPL_IF			(0x0c|OPBIT_REQ_INPUT)
#define OPCODE_SWITCH			(0x0d|OPBIT_REQ_INPUT)
#define OPCODE_SWITCHL			(0x0e|OPBIT_REQ_INPUT)
#define OPCODE_FLUSHB			(0x0f)										// flush the contents of the output buffer
#define OPCODE_PRINTB			(0x10)										// print the contents of the output buffer
#define OPCODE_PRINTC			(0x11|OPBIT_REQ_INPUT)						// output next character in program memory
#define OPCODE_PRINTS			(0x12)										// print literal string from program memory until null character is encountered

#define OPCODE_EXPECTC			(0x13|OPBIT_REQ_INPUT|OPBIT_SWALLOWS)		// [char] expect to match a char or FAIL
#define OPCODE_EXPECT			(0x14|OPBIT_REQ_INPUT|OPBIT_SWALLOWS)		// [LEN] [CHAR ARRAY] expect to match a given string or FAIL
#define OPCODE_EXPECTJ			(0x15|OPBIT_REQ_INPUT|OPBIT_SWALLOWS)		// [LEN] [CHAR ARRAY] [JUMPADDR] expect to match a given string or jump to address

#define OPCODE_ACCEPT			(0x16|OPBIT_REQ_INPUT|OPBIT_SWALLOWS)						// accept/output the input and wait for next input
#define OPCODE_READ				(0x18|OPBIT_REQ_INPUT|OPBIT_SWALLOWS)
#define OPCODE_STOP				(0x19)
#define OPCODE_STOP_WSTATE		(0x1a)

#define OPCODE_LDI				(0x1b)		// load W register with value from input (note: this loads last input value, but does not require input to be valid, nor will it yield)
#define OPCODE_LDL				(0x1c)		// load W register with literal 8bit value from operand
#define OPCODE_LDLL				(0x1d)		// load W register with literal 16bit value from operand
#define OPCODE_DEC_JNZ			(0x1e)		// decrement W and jump to target if it's zero

// Opcodes for toggling states/flags
#define OPCODE_OE				(0x1f)		// output enable
#define OPCODE_OE_N				(0x20)		// output disable
#define OPCODE_MMR				(0x21)		// abort on mismatch
#define OPCODE_MMR_N			(0x22)		// abort on mismatch (disable)


class uExpect;

// callback that writes out to the device the spark is reading from, used to send messages back 
// through the client connection.
typedef int(*write_function)(void* writeContext, const char* output, int length);

typedef short(*uExpect_callback)(uExpect* pst, void* context);
typedef std::map<short, uExpect_callback> callbacks_table;

#ifdef HAS_CONTEXT
class uContext
{
	const char* program;	// the suffix tree byte-code program
	const char* pc;			// the program counter (program position)
	bool owns_pgm_mem;		// true if we allocated the program memory

	// some instructions span multiple characters/reads and thus the executer must yield
	// and store execution state inside these variables
	unsigned char active_opcode;	// if non-zero we have an instruction that spans multiple characters and thus yields
	short w;
};
#endif

class uExpect
{
	char* output;			// the output buffer
	char* output_end;		// the current insert position of the output buffer

	// the state functions
	callbacks_table callbacks;
	void* user_context;
public:
	write_function __write;
	void* write_context;

protected:
	static int default_write(void* writeContext, const char* output, int length);

public:
	uExpect();
	uExpect(const char* _program);
	~uExpect();

	void Reset();

	// resets the machine and sets a new program (will allocate and copy the program text)
	void Reset(const char* _program, int length);

	// resets the machine and sets the program to a program in static memory (does not copy but program must remain in scope)
	void ResetStatic(const char* _program);

	// process the next character of input
	int Process(short input);

	// process an input string and returns the pointer into 'input' that processing stopped.
	// This simply calls the single character process function. It may not process all input if a STOP or FAIL
	// condition occurs. If so, then the result gets placed into the 'result' variable and the position of the
	// next character of input is returned.
	const char* Process(const char* input, int length, int* result);	// of specific length and can accept null characters
	const char* Process(const char* input, int* result);	// until null character

	// set the output buffer
	void SetOutputBuffer(char* _output, int _length);

	// get the output buffer
	inline const char* GetOutputBuffer() const { return output; }
	inline char* GetOutputBuffer() { output_end[0]=0; return output; }

	// get the number of characters in the output buffer
	inline short GetOutputLength() const { return output_end-output; }

	// empty/clear the output buffer
	void FlushOutput() { output_end = output; }

	// get the current program counter position
	inline int getPC() const { return pc - program; }

	// set a callback
	inline void SetCallback(short iState, uExpect_callback cb) { callbacks[iState] = cb; }

	// set the user context passed in for callbacks
	inline void SetUserCallbackContext(void* _context) { user_context = _context; }

	// write to the output device
	inline int write(const char* str, int length) { return __write(write_context, str, length); }

	/****
	 ****    Things you don't need to know 
	 ****/

	int state;			// the state returned by the uExpect using the "exit w/ state" opcode (states are defined by user in the program)

	// the current execution context we are running
	const char* program;	// the suffix tree byte-code program
	const char* pc;			// the program counter (program position)
	bool owns_pgm_mem;		// true if we allocated the program memory

	// some instructions span multiple characters/reads and thus the executer must yield
	// and store execution state inside these variables
	unsigned char active_opcode;	// if non-zero we have an instruction that spans multiple characters and thus yields
	short w;	// our one and only W (working) register

	// flags/options
	bool outputEnable;		// output will only be sent if this is true
	bool abortOnMismatch;	// if true, a mismatched character in match mode aborts processing


	// get a 16bit integer from the program memory as an operand and increment the PC
	inline int16_t operand16() { short x = (((short)*(unsigned char*)(pc) <<8) | (short)*(unsigned char*)(pc+1)); pc+=2; return x; }

#ifdef HAS_STACK
	// the ministack
	int stack[STACK_SIZE];
	int* pstack;

	// push or pop a value from the program stack
	inline int16_t pop() { return *--pstack; }
	inline void push(int16_t v) { *pstack++ = v; }
#endif

};

#endif // __UEXPECT_H
