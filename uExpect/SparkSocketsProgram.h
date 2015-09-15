#pragma once

#include "../uExpect/uExpectBuilder.h"


class SparkSocketsProgram
{
public:
	SparkSocketsProgram();
	~SparkSocketsProgram();

	static int Compile(uExpectBuilder& builder);
};

