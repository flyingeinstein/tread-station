PROJECT=treadstation

SOURCES=treadstation.cpp SparkIntervalTimer.cpp
HEADERS=SparkIntervalTimer.h 

FIRMWARE_BINARY=$(PROJECT).bin

# DO NOT MODIFY  - to override, rename Makefile.my.sample to Makefile.my and edit
###############
FLASH_TARGET?=48ff73065067555026182287

FLASH_PROTOCOL=usb


main: flash

compile: $(SOURCES) $(HEADERS)
	@echo Compiling $(PROJECT)
	@spark compile $(SOURCES) $(HEADERS) firmware-version.h $(FIRMWARE_BINARY)

flash: $(FIRMWARE_BINARY)
	@echo Flashing $(PROJECT)
ifdef FLASH_PROTOCOL
	spark flash --$(FLASH_PROTOCOL) $(FIRMWARE_BINARY)
else
	@spark flash $(FLASH_TARGET) $(FIRMWARE_BINARY)
endif

# file dependancies
$(FIRMWARE_BINARY): $(SOURCES) $(HEADERS)
	@echo Compiling $(PROJECT)
	@[ ! -e firmware-version.h ] && echo "versioning project" && awk -- '/#define FIRMWARE_VERSION/ {printf("%s %s %d\n", $$1,$$2,$$3)}' < treadstation.cpp > firmware-version.h
	@awk -- '{printf("%s %s %d\n", $$1,$$2,$$3+1)}' < firmware-version.h > __firmware.version
	@mv __firmware.version firmware-version.h
	@[ -e $(FIRMWARE_BINARY) ] && rm $(FIRMWARE_BINARY) || true
	@spark compile $(SOURCES) $(HEADERS) firmware-version.h $(FIRMWARE_BINARY)

