#ifndef _UEXPECT_BUILDER_H
#define _UEXPECT_BUILDER_H

#include <stdlib.h>
#include <string.h>

#include <map>
#include <vector>
#include <algorithm>
#include <sstream>

#include "uExpect.h"

/*
             _/_/_/_/                                            _/      
  _/    _/  _/        _/    _/  _/_/_/      _/_/      _/_/_/  _/_/_/_/   
 _/    _/  _/_/_/      _/_/    _/    _/  _/_/_/_/  _/          _/        
_/    _/  _/        _/    _/  _/    _/  _/        _/          _/         
 _/_/_/  _/_/_/_/  _/    _/  _/_/_/      _/_/_/    _/_/_/      _/_/      
                            _/                                           
                           _/                                                      
*/

typedef std::vector<short> references;

class label
{
public:
	inline label() : address(-1) {}

	// the following generate labels with names but with a blank address
	// mark() and jump() instructions will accept label objects
	inline label(const char* _name) : address(-1), name(_name) {}
	inline label(const char* prefix, int number) : address(-1) {
		std::ostringstream s;
		s << prefix << number;
		name = s.str();
	}

	inline bool isValid() const { return address >= 0; }

	inline operator const char*() const { return name.c_str(); }

	short address;
	std::string name;
	references references8;		// 8bit target references
	references references16;	// 16bit target references
};

typedef std::map<std::string, label> label_map;
typedef std::vector<std::string> exports_list;

class uExpectBuilder
{
public:
	uExpectBuilder();

	uExpectBuilder(const char* program, int length);

	inline size_t length() const { return pc - program; }

	uExpectBuilder& begin();
	uExpectBuilder& end();

	// End the program and link remaining references
	uExpectBuilder& end_program();

	// load the W register with a value
	uExpectBuilder& ldi();	// from value in the input register
	uExpectBuilder& ldl(char value);	// from literal 8bit value
	uExpectBuilder& ldll(short value);	// from literal 16bit value

	// expect to match a certain string or FAIL
	uExpectBuilder& expect(char c);
	uExpectBuilder& expect(const char* str);
	uExpectBuilder& expectj(const char* str, short target) ;

	// send the buffer contents to output device
	uExpectBuilder& print(const char* str);

	// output a switch statement
	uExpectBuilder& begin_switch();
	uExpectBuilder& begin_switchl();
	uExpectBuilder& when(char match, const char* label_name);
	uExpectBuilder& end_switch();

	// call a function (attach functions to the callbacks array in uExpect runtime)
	uExpectBuilder& call(short state_callback);

	// call a function, then jump to target if return value is 0
	uExpectBuilder& calljz(short state_callback, const char* label_name);
	uExpectBuilder& calljnz(short state_callback, const char* label_name);

	// call a function which returns a value, then long switch on that value
	// use callx(state) followed by when() and end_switch()
	uExpectBuilder& callx(short state_callback);

	uExpectBuilder& jump(const char* label_name);
	uExpectBuilder& jumpl(const char* label_name);
	uExpectBuilder& jump_if(char match, const char* label_name);

	uExpectBuilder& dec_jnz(const char* label_name);


	uExpectBuilder& mark(label lbl);
	uExpectBuilder& mark(const char* label_name);

	// mark a label to be exported along with the program code
	// exports can be used to jump into execution at a determined spot
	uExpectBuilder& exportLabel(const char* label_name);

	inline uExpectBuilder& printOutput() { emit(OPCODE_PRINTB); return *this; }
	inline uExpectBuilder& flush() { emit(OPCODE_FLUSHB); return *this; }


	inline uExpectBuilder& accept() { emit(OPCODE_ACCEPT); return *this; }
	inline uExpectBuilder& read() { emit(OPCODE_READ); return *this; }

	uExpectBuilder& accept_upto(char c);			// read into buffer up to given char (char stays in input)
	uExpectBuilder& accept_until(char c);			// read into buffer up to given char (swallows the char)
	uExpectBuilder& accept_until(const char* str);	// read into buffer up to given string (internally: until str[0] then expect str)

	uExpectBuilder& ignore_upto(char c);			// read into buffer up to given char (char stays in input)
	uExpectBuilder& ignore_until(char c);			// read into buffer up to given char (swallows the char)
	uExpectBuilder& ignore_until(const char* str);	// read into buffer up to given string (internally: until str[0] then expect str)

	inline uExpectBuilder& output(char c) { emit(OPCODE_PRINTC, c); return *this; }
	inline uExpectBuilder& stop() { emit(OPCODE_STOP); return *this; }
	inline uExpectBuilder& stop(int state) { emit16(OPCODE_STOP_WSTATE, state); return *this; }

	inline uExpectBuilder& oe(bool enable) { emit(enable ? OPCODE_OE : OPCODE_OE_N); return *this; }
	inline uExpectBuilder& abortOnMismatch(bool enable) { emit(enable ? OPCODE_MMR : OPCODE_MMR_N); return *this; }


	inline uExpectBuilder& emit(char opcode) { begin(); *pc++ = opcode; return *this; }
	inline uExpectBuilder& emit(char opcode, char operand) { emit(opcode); emit(operand); return *this; }
	inline uExpectBuilder& emit(char opcode, char operand1, char operand2) { emit(opcode); emit(operand1); emit(operand2); return *this; }
	inline uExpectBuilder& emit16(short operand) { emit((operand >> 8) & 0xff); emit(operand & 0xff); return *this; }
	inline uExpectBuilder& emit16(char opcode, short operand) { emit(opcode); emit16(operand); return *this; }
	inline uExpectBuilder& emit16(char opcode, short operand1, short operand2) { emit(opcode); emit16(operand1); emit16(operand2); return *this; }

	// update references to labels (jump targets)
	uExpectBuilder& link();

	// update references (jump targets) for a given label
	void link(label& l);

	// return the insert position of new code (current program counter address)
	inline short pc_addr() const { return pc - program; }

	// decode the program as uExpect assembly output
	std::string disassemble();

	// print the program of as a C-string embedded program
	// decl - output as a C string declaration
	// width - keep the output limited to a certain width but spread accross multiple lines
	std::string compiled(bool decl=true, int width=-1);

	// escape the given character to C-like string syntax
	std::ostringstream& outc(std::ostringstream& s, char c);
	std::ostringstream& outstr(std::ostringstream& s, std::string str);


	char program[4096];
	char* pc;
	bool inProgramMode;
	label_map labels;
	exports_list exports;
	int next_label_number;
	bool longMode;
};

#endif // _UEXPECT_BUILDER_H



