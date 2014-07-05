PROJECT=treadstation

SOURCES=treadstation.cpp SparkIntervalTimer.cpp
HEADERS=SparkIntervalTimer.h

FIRMWARE_BINARY=${PROJECT}.bin


main: compile

compile:
	@echo Compiling TreadStation
	@spark compile $(SOURCES) $(HEADERS) $(FIRMWARE_BINARY)

