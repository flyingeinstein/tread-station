
#include "uExpectBuilder.h"

#include <ctype.h>
#include <iomanip>
#include <stdio.h>

/*
             _/_/_/_/                                            _/      
  _/    _/  _/        _/    _/  _/_/_/      _/_/      _/_/_/  _/_/_/_/   
 _/    _/  _/_/_/      _/_/    _/    _/  _/_/_/_/  _/          _/        
_/    _/  _/        _/    _/  _/    _/  _/        _/          _/         
 _/_/_/  _/_/_/_/  _/    _/  _/_/_/      _/_/_/    _/_/_/      _/_/      
                            _/                                           
                           _/                                                      
*/

void print_label(std::ostringstream& ss, std::vector<short>& addresses, std::map<short, std::string>& names, short _pc, short offset)
{
	short addr = _pc + offset;
	std::string name = (names.find(addr) != names.end()) ? names[addr] : "<?>";
	ss << "  " << std::dec << offset << " => " << name << '@'  << std::setfill('0') << std::setw(4) << std::hex << std::right << addr << std::setfill(' ');
}

uExpectBuilder::uExpectBuilder()
{
	pc = program;
	inProgramMode = true;
	next_label_number = 1;
	longMode = false;
}

uExpectBuilder::uExpectBuilder(const char* _program, int _length)
{
	memcpy(program, _program, _length);
	pc = program + _length;
	inProgramMode = true;
	next_label_number = 1;
	longMode = false;
}

uExpectBuilder& uExpectBuilder::begin()
{
#if 0
	if (!inProgramMode) {
		*pc++ = ESCAPE_CODE;
		inProgramMode = true;
	}
#endif
	return *this;
}

uExpectBuilder& uExpectBuilder::end()
{
#if 0
	if (inProgramMode) {
		*pc++ = OPCODE_EXIT;
		inProgramMode = false;
	}
#endif
	return *this;
}

uExpectBuilder& uExpectBuilder::end_program() 
{
	// for now we are just a synonym for link
	return link();
}

uExpectBuilder& uExpectBuilder::ldi()
{
	return emit(OPCODE_LDI);
}

uExpectBuilder& uExpectBuilder::ldl(char value)
{
	return emit(OPCODE_LDI, value);
}

uExpectBuilder& uExpectBuilder::ldll(short value)
{
	return emit16(OPCODE_LDI, value);
}

uExpectBuilder& uExpectBuilder::expect(char c)
{
	return emit(OPCODE_EXPECTC, c);
}

uExpectBuilder& uExpectBuilder::expect(const char* str) 
{
	int len = strlen(str);
	int l;
	// for long strings, use as many instructions as necessary to print out the string
	while (len >0) {
		l = std::min(len, 255);
		emit( OPCODE_EXPECT, l);
		memcpy(pc, str, l); 
		pc += l;
		len -= l;
	}
	return *this;
}

uExpectBuilder& uExpectBuilder::expectj(const char* str, short target) 
{
	int len = strlen(str);
	int l;
	// for long strings, use as many instructions as necessary to print out the string
	while (len >0) {
		l = std::min(len, 255);
		emit( OPCODE_EXPECT, l);
		memcpy(pc, str, l); 
		pc += l;
		len -= l;
		emit16(target);
	}
	return *this;
}

uExpectBuilder& uExpectBuilder::mark(const char* label_name)
{
	begin();
	label& lbl = labels[label_name];
	if (lbl.isValid()) {
		printf("warning: label '%s' already used @%d and is being recycled.", label_name, lbl.address);
		link(lbl);	// link this previously used label and clear it
	}
	lbl.name = label_name;
	lbl.address = pc - program;
	return *this;
}

uExpectBuilder& uExpectBuilder::mark(label lbl)
{
	begin();
	if (labels.find(lbl.name) != labels.end()) {
		label& olbl =labels[lbl.name];
		if (olbl.address >= 0) {
			printf("warning: label '%s' already used @%d and is being recycled.", lbl.name.c_str(), lbl.address);
			link(olbl);	// link this previously used label and clear it
		}
		else {
			// this label was references before it was defined, so we can now just set the 
			// address of the existing label
			olbl.address = lbl.address = pc - program;
			return *this;
		}
	}
	// warning: this means the user's label is not the same reference as the label in the collection
	// we will update his address, but his references8/16 collection will be empty
	label& nlbl = (labels[lbl.name] = lbl);
	lbl.address = nlbl.address = pc - program;
	return *this;
}


uExpectBuilder& uExpectBuilder::exportLabel(const char* label_name)
{
	exports.insert(exports.end(), label_name);
	return *this;
}


uExpectBuilder& uExpectBuilder::jump_if(char match, const char* label_name)
{
	label& lbl = labels[label_name];
	emit(OPCODE_JUMP_IF, match, 0);	// placeholder for addr
	lbl.references8.insert(lbl.references8.end(), pc_addr()-1);
	return *this;
}

uExpectBuilder& uExpectBuilder::jump(const char* label_name)
{
	label& lbl = labels[label_name];
	emit(OPCODE_JUMP8, 0);	// placeholder for addr
	lbl.references8.insert(lbl.references8.end(), pc_addr()-1);
	return *this;
}

uExpectBuilder& uExpectBuilder::jumpl(const char* label_name)
{
	label& lbl = labels[label_name];
	emit16(OPCODE_JUMP16, 0);	// placeholder for addr
	lbl.references16.insert(lbl.references16.end(), pc_addr()-1);
	return *this;
}

uExpectBuilder& uExpectBuilder::call(short state_callback)
{
	emit16(OPCODE_VCALL, state_callback);
	return *this;
}

uExpectBuilder& uExpectBuilder::calljz(short state_callback, const char* label_name)
{
	label& lbl = labels[label_name];
	emit16(OPCODE_VCALLJZ, state_callback, 0);
	lbl.references16.insert(lbl.references16.end(), pc_addr()-1);
	return *this;
}

uExpectBuilder& uExpectBuilder::calljnz(short state_callback, const char* label_name)
{
	label& lbl = labels[label_name];
	emit16(OPCODE_VCALLJNZ, state_callback, 0);
	lbl.references16.insert(lbl.references16.end(), pc_addr()-1);
	return *this;
}

uExpectBuilder& uExpectBuilder::dec_jnz(const char* label_name)
{
	label& lbl = labels[label_name];
	emit(OPCODE_DEC_JNZ, 0);	// placeholder for addr
	lbl.references8.insert(lbl.references8.end(), pc_addr()-1);
	return *this;
}

uExpectBuilder& uExpectBuilder::callx(short state_callback)
{
	emit(OPCODE_VCALLX);
	longMode = true;
	return *this;
}


uExpectBuilder& uExpectBuilder::begin_switch()
{
	emit(OPCODE_SWITCH);
	longMode = false;
	return *this;
}

uExpectBuilder& uExpectBuilder::begin_switchl()
{
	emit(OPCODE_SWITCHL);
	longMode = true;
	return *this;
}

uExpectBuilder& uExpectBuilder::when(char match, const char* label_name)
{
	label& lbl = labels[label_name];
	if (longMode)
	{
		emit16(match, 0);	// placeholder for addr
		lbl.references16.insert(lbl.references16.end(), pc_addr() - 1);
	}
	else 
	{
		emit(match, 0);	// placeholder for addr
		lbl.references8.insert(lbl.references8.end(), pc_addr() - 1);
	}
	return *this;
}

uExpectBuilder& uExpectBuilder::end_switch()
{
	emit(0);
	return *this;
}

uExpectBuilder& uExpectBuilder::print(const char* str) 
{ 
	emit(OPCODE_PRINTS);  
	strcpy(pc, str); 
	pc += strlen(str);
	*pc++ =0;
	return *this; 
}

uExpectBuilder& uExpectBuilder::accept_upto(char c) 
{
	int n = next_label_number++;
	label au_repeat("__au_rpt_",n), au_end("__au_end_",n);
	return mark(au_repeat)
	.jump_if(c, au_end)
	.accept()
	.jump(au_repeat)
	.mark(au_end)
	.output(0);
}

uExpectBuilder& uExpectBuilder::accept_until(char c) 
{
	return accept_upto(c).read();
}

uExpectBuilder& uExpectBuilder::accept_until(const char* str)
{
	if (str==NULL) return *this;
	switch (strlen(str))
	{
		case 0: return *this;
		case 1: return accept_until(str[0]);
		case 2: return accept_until(str[0]).expect(str[1]);	// simpler 2 char expect
		default: return accept_until(str[0]).expect(&str[1]);	// expect of any length
	}
}

uExpectBuilder& uExpectBuilder::ignore_upto(char c) 
{
	int n = next_label_number++;
	label au_repeat("__au_rpt_",n), au_end("__au_end_",n);
	return mark(au_repeat)
	.jump_if(c, au_end)
	.read()
	.jump(au_repeat)
	.mark(au_end)
	.output(0);
}

uExpectBuilder& uExpectBuilder::ignore_until(const char* str)
{
	if (str==NULL) return *this;
	switch (strlen(str))
	{
		case 0: return *this;
		case 1: return accept_until(str[0]);
		case 2: return accept_until(str[0]).expect(str[1]);	// simpler 2 char expect
		default: return accept_until(str[0]).expect(&str[1]);	// expect of any length
	}
}

void uExpectBuilder::link(label& l)
{
	// link all references to this label now
	for (references::const_iterator r = l.references8.begin(), _r = l.references8.end(); r != _r; r++)
	{
		short offset = (l.address - *r);
		offset--;	// adjustment due to PC already being advanced in program
		if (offset>127 || offset <-127)
			printf("error: jump @%04x => %04x is %d and requires a long jump.", *r, l.address, offset);
		program[*r] = (char)offset;
		//printf("  @%04x => %d (LA%04x)\n", *r, offset, l.address);
	}
	for (references::const_iterator r = l.references16.begin(), _r = l.references16.end(); r != _r; r++)
	{
		short offset = (l.address - *r);
		offset--;	// wtf???
		program[*r-1] = (char)(offset>>8);
		program[*r] = (char)(offset&0xff);
		//printf("  @%04x => L%d (LA%04x)\n", *r, offset, l.address);
	}
	l.references8.clear();
	l.references16.clear();
}

uExpectBuilder& uExpectBuilder::link()
{
	for (label_map::iterator l = labels.begin(), _l = labels.end(); l != _l; l++) {
		//printf("linking %s\n", l->first.c_str());
		link(l->second);
	}
	return *this;
}


std::string uExpectBuilder::disassemble()
{
	short x, y;
	int plain_chars=0;	// let's count the number of characters to compare to the number of code bytes
	std::ostringstream ss; 

	// reorganize and sort labels so we can easily find them
	std::vector<short> label_addresses;
	std::map<short, std::string> label_names;
	for (label_map::const_iterator l = labels.begin(), _l = labels.end(); l != _l; l++)
	{
		label_addresses.insert(label_addresses.end(), l->second.address);
		label_names[l->second.address] = l->first;
	}
	// sort the label in order of address
	std::sort(label_addresses.begin(), label_addresses.end());

	// now start printing our source
	char* _pc = program;
	bool inProgram = true;
	while (_pc < pc)
	{
		// if we have a label at this address, then print it
		std::map<short, std::string>::const_iterator lbl = label_names.find(_pc - program);
		if (lbl != label_names.end())
		{
			if (lbl->second.length()>=2 && lbl->second[0] == '_' && lbl->second[1] == '_')
				ss << "  ";
			ss << lbl->second << ":\n";
		}

		// print the address
		ss << "    " << std::right << std::setw(4) << std::setfill('0') << std::hex << (_pc - program) << ":  " << std::setfill(' ') << std::left;

		// print the opcode
		unsigned char opcode = *_pc;
#define OPCODE_PRINT_CASE(op)	case OPCODE_##op : ss << std::setw(10) << #op; _pc++;
#define OPERAND (*_pc++)
#define OPERAND_U8 (*(unsigned char*)_pc++)
#define OPERAND16 (((short)*(unsigned char*)(_pc) <<8) | (short)*(unsigned char*)(_pc+1))
#define PRINT_ADDR	print_label(ss, label_addresses, label_names, _pc - program, OPERAND);
#define PRINT_ADDR16	{ print_label(ss, label_addresses, label_names, _pc - program, OPERAND16+2); _pc+=2; }	// OPERAND16+2 because if we were executing PC would be set after the operand by the time the jump occurs
#define PRINT_CHAR	{ ss << "  '"; outc(ss,OPERAND); ss << "'"; plain_chars++; }
#define PRINT_OP16	{ ss << "  " << (OPERAND16); plain_chars+=2; }
#define PRINT_STR 	{ x = OPERAND_U8; plain_chars+=x; ss << "  " << std::dec << x << ":\""; outstr(ss, std::string((const char*)_pc, x)) << "\""; _pc += x; }

		switch (opcode)
		{
			OPCODE_PRINT_CASE(LDI)
				break;
			OPCODE_PRINT_CASE(LDL)
				PRINT_CHAR;
				break;
			OPCODE_PRINT_CASE(LDLL)
				PRINT_OP16;
				break;
			OPCODE_PRINT_CASE(DEC_JNZ)
				PRINT_ADDR;
				break;
			OPCODE_PRINT_CASE(JUMP_IF)
				PRINT_CHAR;
				PRINT_ADDR;
				break;
			OPCODE_PRINT_CASE(JUMPL_IF)
				break;
			OPCODE_PRINT_CASE(SWITCH)
				do {
					ss << std::endl << "        " << std::right << std::setw(4) << std::setfill('0') << std::hex << _pc - program << ":  "  << std::setfill(' ');
					PRINT_CHAR;
					PRINT_ADDR;
				}  while (*_pc != 0);
				_pc++;
				break;
			OPCODE_PRINT_CASE(SWITCHL)
				do {
					ss << std::endl << "        " << std::right << std::setw(4) << std::setfill('0') << std::hex << _pc - program << ":  "  << std::setfill(' ');
					PRINT_CHAR;
					PRINT_ADDR16;
				}  while (*_pc != 0);
				_pc++;
				break;
			OPCODE_PRINT_CASE(EXPECTC)
				PRINT_CHAR;
				break;
			OPCODE_PRINT_CASE(EXPECT)
				PRINT_STR;
				plain_chars++;
				break;
			OPCODE_PRINT_CASE(EXPECTJ)
				PRINT_STR;
				PRINT_ADDR;
				break;
			OPCODE_PRINT_CASE(RETURN)
				break;
			OPCODE_PRINT_CASE(JUMP8)
				PRINT_ADDR;
			break;
			OPCODE_PRINT_CASE(JUMP16)
				PRINT_ADDR16;
				break;
			OPCODE_PRINT_CASE(STOP)
				break;
			OPCODE_PRINT_CASE(STOP_WSTATE)
				ss << "  " << std::dec << OPERAND16;
				_pc+=2;
			break;
			OPCODE_PRINT_CASE(ACCEPT)
				break;
			OPCODE_PRINT_CASE(PRINTC)
				PRINT_CHAR;
				break;
			OPCODE_PRINT_CASE(READ)
				break;
			OPCODE_PRINT_CASE(VCALL)
				ss << "  " << std::dec << OPERAND16; _pc+=2;
				break;
			OPCODE_PRINT_CASE(VCALLJZ)
				ss << "  " << std::dec << OPERAND16 << ", "; _pc+=2;
				PRINT_ADDR16;
				break;
			OPCODE_PRINT_CASE(VCALLJNZ)
				ss << "  " << std::dec << OPERAND16 << ", "; _pc+=2;
				PRINT_ADDR16;
				break;
			OPCODE_PRINT_CASE(VCALLX)
				ss << "  " << std::dec << OPERAND16; _pc+=2;
				do {
					ss << std::endl << "        " << std::right << std::setw(4) << std::setfill('0') << std::hex << _pc - program << ":  "  << std::setfill(' ');
					PRINT_CHAR;
					PRINT_ADDR16;
				}  while (*_pc != 0);
				_pc++;
				break;
			OPCODE_PRINT_CASE(FLUSHB)
				break;
			OPCODE_PRINT_CASE(PRINTB)
				break;
			OPCODE_PRINT_CASE(PRINTS)
				ss << "  \"";
				while (*pc != 0) {
					outc(ss, OPERAND);	// TODO: Convert to use outstr()
					plain_chars++;
				}
				ss << "\"";
				break;
			OPCODE_PRINT_CASE(OE)
				break;
			OPCODE_PRINT_CASE(OE_N)
				break;
			OPCODE_PRINT_CASE(MMR)
				break;
			OPCODE_PRINT_CASE(MMR_N)
				break;
		default:
			ss <<  '<' << std::hex << opcode << ":?>" << std::endl;
			return ss.str();
		}
		ss << std::endl;
#undef OPCODE_PRINTL			
	}
	int pgmsize = _pc - program;
	ss << "    " << std::right << std::setw(4) << std::setfill('0') << std::hex << (pgmsize) << ":  <end-of-program   code:" << std::dec << (pgmsize - plain_chars) << "  text:" << plain_chars <<">" << std::setfill(' ') << std::left;
	return ss.str();
}

std::ostringstream& uExpectBuilder::outstr(std::ostringstream& s, std::string str)
{
	for (std::string::const_iterator i = str.begin(), _i = str.end(); i!=_i; i++)
		outc(s,*i);
	return s;
}

std::ostringstream& uExpectBuilder::outc(std::ostringstream& s, char c)
{
	// output the character but watch out for special characters that would screw up a C string
	switch (c)
	{
		case 0: s << "\\000"; break;
		case '\r': s << "\\r"; break; 
		case '\n': s << "\\n"; break; 
		case '\t': s << "\\t"; break; 
		case '\f': s << "\\f"; break; 
		case '\'': s << "\\'"; break; 
		case '\"': s << "\\\""; break; 
		case '\\': s << "\\\\"; break; // escape the slash
		default:
			if (c>0 && c<128 && isprint(c))
				s << c;
			else {
				char oldfill = s.fill();
				int oldw = s.width();
				s << "\\" << std::setw(3) << std::setfill('0') << std::oct << (static_cast<unsigned>(c) & 0xff) << std::setw(oldw) << std::setfill(oldfill);
			}
			break;
	}
	return s;
}

std::string uExpectBuilder::compiled(bool decl, int width)
{
	// print the program of as a C-string embedded program
	const char* _pc = program;
	std::ostringstream ss;
	int w=0;
	size_t begin_line=0;
	if (decl)
		ss << "const char* precompiled_program = " << std::endl;
	begin_line = ss.tellp();
	while (_pc < pc) {
		if (w == 0)
			ss << "\t\"";
		outc(ss, *_pc++); 
		w = (size_t)ss.tellp() - begin_line;
		if (width>0 && w > width) {
			ss << "\"" << std::endl;
			begin_line = ss.tellp();
			w=0;
		}
	}
	if (decl)
		ss << ((w==0) ? ";" : "\";") << std::endl;

	// now list any exports and their entry point
	for (exports_list::const_iterator e = exports.begin(), _e = exports.end(); e != _e; e++)
	{
		// find the label defined by this export
		label_map::const_iterator l = labels.find(*e);
		if (l != labels.end())
		{
			ss << "const ushort " << l->second.name << " = " << l->second.address << ';' << std::endl;
		} else
			ss << "// export " << *e << " not found" << std::endl;
	}

	return ss.str();
}
