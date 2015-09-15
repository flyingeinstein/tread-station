#include "uExpect.h"

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <ctype.h>

/*
             _/_/_/_/                                            _/      
  _/    _/  _/        _/    _/  _/_/_/      _/_/      _/_/_/  _/_/_/_/   
 _/    _/  _/_/_/      _/_/    _/    _/  _/_/_/_/  _/          _/        
_/    _/  _/        _/    _/  _/    _/  _/        _/          _/         
 _/_/_/  _/_/_/_/  _/    _/  _/_/_/      _/_/_/    _/_/_/      _/_/      
                            _/                                           
                           _/                                                      
*/

#define default_write NULL

uExpect::uExpect()
: program(NULL), pc(NULL), owns_pgm_mem(false), output(NULL), output_end(NULL), state(0), outputEnable(true), abortOnMismatch(true), active_opcode(0), w(0), __write(default_write), write_context(NULL)
#ifdef HAS_STACK
	, pstack(stack)
#endif
#ifdef TRACE
	, __trace(NULL)
#endif
{
}

uExpect::uExpect(const char* _program)
	: program(NULL), pc(NULL), owns_pgm_mem(false), output(NULL), output_end(NULL), state(0), outputEnable(true), abortOnMismatch(true), active_opcode(0), w(0), __write(default_write), write_context(NULL)
#ifdef HAS_STACK
	, pstack(stack)
#endif
#ifdef TRACE
	, __trace(NULL)
#endif
{
	ResetStatic(_program);
}

uExpect::~uExpect()
{
	//if (owns_pgm_mem)
	//	free((void*)program);
}

#if 0
int SparkSockets::default_write(void* writeContext, const char* output, int length)
{
	return printf(output);
}
#endif


void uExpect::Reset()
{
	pc = program;
	outputEnable = true;
	if (output != NULL) 
		output_end = output; 
	abortOnMismatch = true;
#ifdef HAS_STACK
	pstack = stack;
#endif
}

void uExpect::Reset(const char* _program, int length)
{
	char* pgm = (char*)malloc(length+5);
	memcpy(pgm, _program, length);
	owns_pgm_mem = true;
	program = pgm;
	Reset();
}

void uExpect::ResetStatic(const char* _program)
{
	program = _program;
	Reset();
}

void uExpect::SetOutputBuffer(char* _output, int _length)
{
	output = _output;
	output_end = output;
}

const char* uExpect::Process(const char* input, int length, int* result)
{
	int res;
	while (length-->0) {
		res = Process(*input++);
		if (res != ST_NEXT && res != ST_IGNORED) {
			if (result != NULL) 
				*result = res;
			return input;
		}
	}
	if (result != 0)
		*result = ST_NEXT;
	return input;
}

const char* uExpect::Process(const char* input, int* result)
{
	int res;
	while (*input != 0) {
		res = Process(*input++);
		if (res != ST_NEXT && res != ST_IGNORED) {
			if (result != NULL) 
				*result = res;
			return input;
		}
	}
	if (result != 0)
		*result = ST_NEXT;
	return input;
}

char msg[100];
int uExpect::Process(short input)
{
	unsigned char opcode;
	short x;
	bool haveInput = true;

#define OPERAND		(*pc)
#define POP_OPERAND    (*pc++)
#define POP_OPERAND_U8 (*(unsigned char*)pc++)


restart:
	if (active_opcode > 0) {
#ifdef TRACE
		x=sprintf(msg, "\t: %d '%c'\r\n", input, isprint(input) ? input : '?');
		if(__trace) __trace(write_context, msg, x);
#endif
		switch (active_opcode) {
			case OPCODE_EXPECTJ:
				if (input == OPERAND) {
					if (outputEnable && output_end!=NULL)
						*output_end++ = input;
					pc++;
					if (--w == 0) {
						active_opcode=0;
						haveInput=false;
						pc += 2;	// skip jump
						goto next_instruction;
					} else
						return ST_NEXT;	// require another read
				}
				else 
				{
					// FAIL - run to end of string, then jump to addr
					pc += w-1;	// run to end of program string
					pc += operand16();		// jump to target address
					active_opcode=0;
					haveInput=false;
					goto next_instruction;
				}
			case OPCODE_EXPECT:
				if (input == OPERAND) {
					if (outputEnable && output_end!=NULL)
						*output_end++ = input;
					pc++;
					if (--w == 0) {
						active_opcode=0;
						haveInput = false;
						goto next_instruction;	// allows program continuation after match
					} else
						return ST_NEXT;	// require another read
				} else {
					active_opcode=0;
					goto mismatch;
				}
			default:
				return ST_BAD_PROGRAM;	// unrecognized continuation opcode
		}
	}

next_instruction:
	//printf("%04x:", pc - program);
	opcode = *pc;	// fetch next instruction
	if (!haveInput && (opcode & OPBIT_REQ_INPUT))
		return ST_NEXT;

#ifdef TRACE
	x=sprintf(msg, "%04x: %02x <= %d '%c'\r\n", getPC(), opcode, input, isprint(input) ? input : '?');
	if(__trace) __trace(write_context, msg, x);
#endif

	pc++;
	switch (opcode)
	{
#ifdef HAS_STACK
		case OPCODE_PUSH: 
			push(w); 
			break;
		case OPCODE_RETURN: 
			pc = program + pop(); 
			break;
#endif
		case OPCODE_LDI:
			w = input;
			break;
		case OPCODE_LDL:
			w = POP_OPERAND;
			break;
		case OPCODE_LDLL:
			w = operand16();
			break;
		case OPCODE_DEC_JNZ:
			if(--w >0)
				pc += (int8_t)POP_OPERAND;	// jump 8bit
			else
				pc++;	// skip jump target
			break;
		case OPCODE_JUMP_IF:
			if (input == POP_OPERAND)
				pc += (int8_t)POP_OPERAND;	// jump 8bit
			else
				pc++;	// skip jump target
			break;
		case OPCODE_JUMPL_IF:
			if (input == POP_OPERAND)
				pc += operand16();	// jump 16bit
			else
				pc+=2;	// skip jump target
			break;
		case OPCODE_SWITCH:
switch_match8:
			if (input == POP_OPERAND)
				pc += (int8_t)POP_OPERAND;	// jump 8bit
			else {
				pc++;	// skip target
				if (OPERAND != 0)
					goto switch_match8;	// test next match
				else pc++;	// swallow end-of-switch marker
			}
			break;
		case OPCODE_SWITCHL:
switch_match16 :
			if (input == POP_OPERAND)
				pc += operand16();	// jump 16bit
			else {
				pc += 2;		// skip target
				if (OPERAND != 0)
					goto switch_match16;	// test next match
				else pc++;	// swallow end-of-switch marker
			}
			break;
		case OPCODE_EXPECTC:
			goto standard_expect;
			break;
		case OPCODE_EXPECT:
			w = POP_OPERAND_U8;
			active_opcode = OPCODE_EXPECT;
			goto restart;	// continuation, will now process the first input character
		case OPCODE_EXPECTJ:
			w = POP_OPERAND_U8;
			active_opcode = OPCODE_EXPECTJ;
			goto restart;	// continuation, will now process the first input character
		case OPCODE_JUMP8: 
			pc += (int8_t)POP_OPERAND; 
			break;
		case OPCODE_JUMP16: 
			pc += operand16(); 
			break;
		case OPCODE_STOP: 
			state = 0;
			return ST_STOP;
		case OPCODE_STOP_WSTATE: 
			state = operand16(); 
			return ST_STOP; 
		case OPCODE_ACCEPT: 
			if (output_end != NULL)	// outputs regardless of outputEnable state
				*output_end++ = input;
			break;
		case OPCODE_PRINTC:
			if (output_end != NULL)	// outputs regardless of outputEnable state
				*output_end++ = POP_OPERAND;
			break;
		case OPCODE_READ:
			// do nothing, will yield anyway
			break;
		case OPCODE_FLUSHB:
			output_end = output;
			break;

#if 1
		case OPCODE_PRINTB:
		case OPCODE_PRINTS:
			break;
#else
		case OPCODE_PRINTB:
			*output_end = 0;
			printf(output);
			break;
		case OPCODE_PRINTS:
			while (OPERAND !=0)
				putc(POP_OPERAND, stdout);
			break;
#endif	

		case OPCODE_VCALL:
			// make a call to a C function
			x = operand16();
			if (callbacks.find(x) != callbacks.end())
				input = callbacks[x](this, user_context);
			break;

		case OPCODE_VCALLJZ:
			// make a call to a C function
			x = operand16();
			if (callbacks.find(x) != callbacks.end() && (input = callbacks[x](this, user_context)) ==0)
				pc += operand16();	// jump 16bit
			else
				pc += 2;	// skip jump target, no callback specified always returns false
			break;

		case OPCODE_VCALLJNZ:
			// make a call to a C function
			x = operand16();
			if (callbacks.find(x) != callbacks.end() && (input = callbacks[x](this, user_context)) !=0)
				pc += operand16();	// jump 16bit
			else
				pc += 2;	// skip jump target, no callback specified always returns false
			break;

		case OPCODE_VCALLX:
			// make a call to a C function
			x = operand16();
			if (callbacks.find(x) != callbacks.end())
				input = callbacks[x](this, user_context);
			goto switch_match16;	// reuse switch here
			break;

		/* flags */
		case OPCODE_OE: outputEnable = true; break;
		case OPCODE_OE_N: outputEnable = false; break;
		case OPCODE_MMR: abortOnMismatch = true; break;
		case OPCODE_MMR_N: abortOnMismatch = false; break;
		default:
			return ST_BAD_PROGRAM;
	}
	//if (opcode & OPBIT_SWALLOWS)
	//	return ST_NEXT;	// require another input character
	//else
	if (opcode & OPBIT_SWALLOWS)
		haveInput = false;
	goto next_instruction;	// we can continue execution
standard_expect:
	if (input == OPERAND) {
		if (outputEnable && output_end!=NULL)
			*output_end++ = input;
		pc++;
		haveInput=false;		// allow to continue if next opcode doesnt require input
		goto next_instruction;
	} // else roll into mismatch
mismatch:
	return abortOnMismatch ? ST_FAIL : ST_IGNORED;
}
