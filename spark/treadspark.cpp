
//-----------------------------------------------
// TREADMILL CONTROLLER based on MC2100
//===============================================
//
// See the README.md file for more information on the control interface.
//
//-----------------------------------------------
// FlyingEinstein.com / Colin - Jun 28th, 2014
//===============================================

// increment this each release
// good way to tell if our firmware got programmed successfully
#define FIRMWARE_VERSION 15

#include "config.h"
#include "SparkIntervalTimer.h"
//#include <EEPROM.h>

// the port the spark will listen on for direct-local connections
#define SERVER_PORT    5600

// enable to make this unit simulate a treadmill but not actually send any control signals
// will disable the PWM and pin interrupts and require only a bare spark
#define SIMULATE

// You can set a speed limit on the machine
// a good idea while you develop your circuitry and software
#define SPEED_SOFT_LIMIT   250 // can go up to 41.0ms pulse, but start off limited to 25ms which is a good run

// Treadmill Platform Speed Controller Machine Limits
// DO NOT INCREASE RANGE!! These are machine limits!
// min/max treadmill speeds in tenths of millis
#define SPEED_MIN   90  // must at least have this speed to move (9.0ms pulse)
#define SPEED_MAX   410 // can go up to 41.0ms pulse, but start off limited to 25ms which is a good run

// Incline Level Machine Limits
// units are in ticks sensed from the incline sensor
#define INCLINE_MAX 100 
#define INCLINE_MIN 0
#define INCLINE_SENSE_TIMEOUT   1000    // timeout after which no sense detection will cause incline motion to stop (in millis)

// Motor Controller-side H2 Header pins into the spark core
// (I've listed them in the same order of the cable on my MC2100, yours may differ but the color coding seems to be universal.)
//      H2_GND                  // BLACK
//      H2_8_TO_12V             // RED      8 to 12 volts
#define H2_TACH             D0  // GREEN    tachometer input to measure actual speed
#define H2_SPEED_CTRL       D1  // BLUE     pin to output the speed control signal  - controller has opto input on this line,
//                                          so output must be resistor current-limited to 15-20mA. Do not connect directly to spark pin!
//                                          FYI - I used a 290ohm resistor in series between spark pin and controller pin for ~17mA
#define H2_INCLINE          A0  // ORANGE   incline command up  - 5v level
#define H2_DECLINE          A2  // YELLOW   incline command down  - 5v level
#define H2_INCLINE_SENSE    A1  // VIOLET   incline sensor  - 5v input level
//      H2_GND                  // BLACK

// Magic ID of the config block to make sure we have valid settings in memory
#define CONFIG_VERSION "tc1"

// Offset into FLASH storage
#define CONFIG_START 32

// Treadmill Platform Speed Control
int speed = SPEED_MIN;              // current treadmill speed in tenths
int desired_speed = SPEED_MIN;      // desired speed (current speed will morph to this speed)
int speed_morph_rate = 2;           // desired accelleration (how fast we change speed since instant speed changes would be killer)
bool running = false;               // true if machine is still in motion
bool enabled = false;               // if false, the machine must slow to a stop

// Treadmill Incline control
int desired_incline = 0;            // desired incline requested by the user
int incline_in_motion = 0;          // 0 if still, -1 if declining, +1 if inclining
volatile unsigned long incline_sense_timeout=0;  // if we haven't sensed an pulse in X ms we must stop and assume a hard limit was met

// General control parameters
bool soft_limit_enabled = true;     // restrict speed to %50 of max

// network variables to make available to the core
char ssid[50];
char ipaddress[32];
int rssi;
int firmwareVersion = FIRMWARE_VERSION;

// events strings
char status[100];
unsigned long next_status_emit=0;
volatile unsigned long next_network_update=0;    // network status is updated when this timer expires
volatile unsigned long save_config_timeout=0;    // if this timer expires we save the config to EEPROM (using this prevents saving too often during activity)

// status and option events 
#define OPT_UPDATE_CLOUD        (1<<0)  // set if we should send our status to the cloud as an event stream
#define OPT_NO_CLOUD_WHEN_LOCAL (1<<1)  // disconnect from the cloud while a local connection exists (will reconnect to cloud if local drops)
#define ST_CLIENT_CONNECTED     (1<<8)  // set if a client is connected to the system
#define ST_INCLINE_TIMEOUT      (1<<9)  // a timeout occured waiting for an incline pulse
#define ST_RESERVED             (1<31)  // would be the negative sign bit so let's reserve it for internal use only)
#define ST_INTERNAL_FLAGS       ( ST_INCLINE_TIMEOUT | ST_RESERVED )    // these flags cannot be read/set by a client
#define ST_USER_MUTABLE         ( OPT_UPDATE_CLOUD )    // all flags that can be set by the UI
unsigned int status_flags=OPT_NO_CLOUD_WHEN_LOCAL;


// Example settings structure
struct TreadmillConfig {
  char version[4];      // This is for mere detection if they are your settings
  int current_incline;  // current incline as measured by counting the pulses from the incline sensor
} config = {
  CONFIG_VERSION,
  // The default values
  0                     // floor incline
};

// load and save settings to non-volatile storage
void loadConfig();
void saveConfig();


// Low-Hz PWM control (interla PWM does not support Hz<360)
#ifndef SIMULATE
IntervalTimer pwm20hz;
//#define PWM_FREQ 20           // in Hertz (SET FREQUENCY OF YOUR TREADMILL SPEED CONTROLLER UNIT)
int pwm_period=500;             // in tenths of a millisecond (MC2100 series is 50ms pwm period)
volatile int pwm_duty=0;       // pwm duty, must be between 0 amd pwm_period. in tenths of a millisecond.
#endif

/****
 ****  Utility functions
 ****/
 
// return a value that is min <= value <= max
int clamp(int value, int min, int max);

// returns integer representation of given flag. 
// TODO: support multiple colon seperated flag inputs
unsigned long GetOptionMask(String option);

// update the network variables that are accesed by the cloud
// such as ipaddress:port, ssid, and rssi
void updateNetwork();

// working variables
int current_morph_rate_count=0; // working variable for smooth speed accelleration

// allows the UI to directly connect to the spark locally
TCPServer server = TCPServer(SERVER_PORT);
TCPClient client;
char cmdbuffer[60]; 
char* pcmdend = cmdbuffer;

/****
 ****  Cloud Messages
 ****/

int Speed(String set_speed)
{
    current_morph_rate_count=speed_morph_rate;  // reset speed morph state
    
    /**** Machine motion commands ****/
    if(set_speed=="STOP") {
        desired_speed = SPEED_MIN;
        enabled = false;
    }
    else if(set_speed=="START") {
        desired_speed = SPEED_MIN;
        enabled = true;
    }
    else if(set_speed=="PANIC") {
        // full stop now!
        desired_speed = SPEED_MIN;
        speed = SPEED_MIN;
        enabled = false;
    }
    else if(set_speed=="REDLINE")
        soft_limit_enabled=false;   // remove safe limits, limiting motion to %50 of capacity (always defaults to ON)
    else if(set_speed=="SAFE") {
        soft_limit_enabled=true;    // enable safe limits
        if(desired_speed>SPEED_SOFT_LIMIT) desired_speed = SPEED_SOFT_LIMIT;
    }
    /**** Accelleration profiles ***/
    else if(set_speed=="AX_CRAWL") 
        speed_morph_rate = 5;
    else if(set_speed=="AX_SLOW")
        speed_morph_rate = 3;
    else if(set_speed=="AX_MEDIUM")
        speed_morph_rate = 2;
    else if(set_speed=="AX_FAST")
        speed_morph_rate = 1;
    /**** set speed to specific value ***/
    else {
        // probably an integer speed value
        int new_speed = set_speed.toInt();
        if(new_speed!=0) {
            enabled=true;
            new_speed = clamp(new_speed, SPEED_MIN, SPEED_MAX);
            if(soft_limit_enabled && new_speed>SPEED_SOFT_LIMIT) new_speed = SPEED_SOFT_LIMIT;
            desired_speed = new_speed;
        } else
            return -1; 
    }
    return 0;
}

int Incline(String set_incline)
{
    if(set_incline=="FLOOR") {
        if(desired_incline!=INCLINE_MIN)
        {
            desired_incline = INCLINE_MIN;
            incline_sense_timeout = millis() + INCLINE_SENSE_TIMEOUT;
        }
    }
    else if(set_incline=="CALIBRATE") {
        // reset the current incline level to floor
        config.current_incline = 0;
        save_config_timeout = millis();   // since incline level changed we must save it to non-volatile memory
    }
    else {
        // probably an integer speed value
        desired_incline = clamp(set_incline.toInt(), INCLINE_MIN, INCLINE_MAX);
        incline_sense_timeout = millis() + INCLINE_SENSE_TIMEOUT;    // ensure we get a pulse within Xms or we abort
    }    
    return 0;
}

int Flags(String option)
{
    if(option.length()==0)
        return status_flags & ~ST_INTERNAL_FLAGS;   // return all flags (except internal ones)
    else {
        switch(option[0]) {
            case '+': return status_flags |= (ST_USER_MUTABLE & GetOptionMask(option.substring(1)));        // add flags
            case '-': return status_flags &= ~(ST_USER_MUTABLE & GetOptionMask(option.substring(1)));       // remove flags
            case '^': return status_flags ^= (ST_USER_MUTABLE & GetOptionMask(option.substring(1)));        // toggle flags
            case '?': return GetOptionMask(option.substring(1));                                            // flags query (return the ordinal value of a flag)
            default:
                return status_flags & GetOptionMask(option);   // get current state of given flags
        }
    }
}

int ProcessCommand(String cmd)
{
    // commands for local connections works off the same Cloud based variables and functions but uses a simple syntax for
    // function and variable execution.
    // ?variable        - read a variable value, available variables are the same as the cloud
    // func=args        - run the function "func" with the give args. func is [Speed,Incline,Flags] with the same args as the cloud functions.
    if(cmd.length()==0)
        return 0;
    
    String args;
    if(cmd[0]=='?') {
        /*
        // Variable
        cmd = cmd.substring(1); // remove the ?
        //args = '#'+cmd;
        if(cmd=="version")
            args = firmwareVersion;
        else args = "undefined";
        //sprintf(status, "#%s:%s", cmd, args);
        server.println(args);
        */
    } else {
        // Function
        int sep = cmd.indexOf('=');
        if(sep>=0) {
            // WTF!!!! I can't do args = cmd.substring()!??!?! I get an undefined reference to String::operator=(String &&) -- yeah, that's a double &
            String s1 = cmd.substring(sep+1);
            String s2 = cmd.substring(0, sep);
            args = s1; cmd = s2;
        }
        if(cmd=="Speed")
            return Speed(args);
        else if(cmd=="Incline")
            return Incline(args);
        else if(cmd=="Flags")
            return Flags(args); // need to write the actual value here!!
    }
    return 0;
}

/****
 ****  Spark initialization
 ****/
 
void setup() 
{
    loadConfig();
    
    // enable the SPEED output pin and setup it's pwm timer
#ifndef SIMULATE
    pinMode(H2_SPEED_CTRL, OUTPUT); // sets the pin as output
    pinMode(H2_INCLINE, OUTPUT); // sets the pin as output
    pinMode(H2_DECLINE, OUTPUT); // sets the pin as output
    digitalWrite(H2_INCLINE_SENSE, 1); // enable pullup
    pwm20hz.begin(pwm_advance, 100, uSec, TIMER4);

    // attach the counter ISR to the incline sense pin
    attachInterrupt(H2_INCLINE_SENSE, incline_pulse_counter, RISING);
#endif
    
    /****
     ****  Cloud Message Setup
     ****  (Uh-oh. Cloud only supports up to 10 variables, and 4 functions!)
     ****/

    // treadmill speed variables
    Spark.variable("speed", &speed, INT);
    Spark.variable("desiredSpeed", &desired_speed, INT);
    Spark.variable("running", &running, BOOLEAN);       // TODO: convert running and enabled bools to flags instead and save variables
    //Spark.variable("enabled", &enabled, BOOLEAN);
    
    // incline variables
    Spark.variable("incline", &config.current_incline, INT);
    Spark.variable("desiredIncline", &desired_incline, INT);
    Spark.variable("inclineInMotion", &incline_in_motion, INT);
    
    //network variables
    Spark.variable("ssid", ssid, STRING);
    Spark.variable("ipaddress", ipaddress, STRING);
    Spark.variable("rssi", &rssi, INT);
    Spark.variable("version", &firmwareVersion, INT);

    // allows querying or setting of system flags and options
    Spark.function("Flags", Flags);
    
    // public functions
    Spark.function("Speed", Speed);
    Spark.function("Incline", Incline);

    // retrieve our network wifi settings and place into variables
    updateNetwork();
    
    // begin listening for TCP connections
    server.begin();
}

/****
 ****  Main processing loop
 ****/

void  loop() {
    delay(50); // wait 10 milliseconds
    unsigned long now = millis();
    
    //output our status as an event
    if(now > next_status_emit)
    {
        // 0 placeholder for measured speed
        sprintf(status,"$%c%c%c:%d:%d:%d:%d:%d", 
            enabled?'E':'-', running?'R':'-', (incline_in_motion>0)?'I':(incline_in_motion<0)?'D':'-',
            speed, desired_speed, 0, config.current_incline, desired_incline
            );
        
        // send to the cloud
        //if((status_flags & OPT_UPDATE_CLOUD) && Spark.connected())
        //    Spark.publish("treadmill",status);
        server.println(status);

        next_status_emit = now + (running ? 1000 : 5000);
    }
    
    if(status_flags>0) 
    {
        if(status_flags & ST_INCLINE_TIMEOUT)
        {
            status_flags &= ~ST_INCLINE_TIMEOUT;
            if(Spark.connected())
                Spark.publish("treadmill","#INCLINE_LIMIT");        // generate an event that we didnt reach the desired level
        }
    }
    
    // network update timer
#if 0
    if(now > next_network_update) {
        updateNetwork();
        next_network_update = now + 10000;
    }

    // save config to EEPROM timer
    if(save_config_timeout>0 && now > save_config_timeout) {
        saveConfig();
        save_config_timeout = 0;
    }
#endif
    
    // client connection handling
    if(client)
    {
        if(client.connected())
        {
            status_flags |= ST_CLIENT_CONNECTED;
            
        } else {
            client.stop();
            if(!Spark.connected()) 
                Spark.connect();
            status_flags &= ~ST_CLIENT_CONNECTED;
        }
    } else {
        if(client = server.available()) {
            delay(50);
            sprintf(status, "#TREAD:%d", firmwareVersion);
            client.println(status);
            // disconnect from cloud if option is set to be exclusive
            if((status_flags&OPT_NO_CLOUD_WHEN_LOCAL) && Spark.connected())
                Spark.disconnect();
        } else
            status_flags &= ~ST_CLIENT_CONNECTED;
    }

    // check for incoming data on the local connection    
    if (client && client.connected()) {
        // echo all available bytes back to the client
        while (client.available()) {
            // nothing
            char c = client.read();
            switch(c) {
                case '\n':
                    *pcmdend=0;
                    ProcessCommand(String(cmdbuffer));
                    pcmdend=cmdbuffer;
                case '\r': 
                    break; // ignore
                default:
                    *pcmdend++ = c;
                    break;
            }
        }
    }
}

#ifndef SIMULATE
/****
 ****  20Hz PWM for MC2100 Speed Controller board
 ****  Also performs some processing that is suited to 20 cycles/sec. Must keep this ISR fast, so no
 ****  communication routines or delays should be performed.
 ****/
void pwm_advance(void) {
    if(enabled || speed>SPEED_MIN)
    {
        running=true;
        pwm_duty++;
        if(speed==pwm_duty)
            digitalWrite(H2_SPEED_CTRL, false);
        if(pwm_duty==pwm_period) {
            pwm_duty=0;
            digitalWrite(H2_SPEED_CTRL, true);
            
            // morph speed if there is a difference
            if(speed!=desired_speed)
            {
                if(--current_morph_rate_count <=0) {
                    current_morph_rate_count=speed_morph_rate;
                    if(speed<desired_speed)
                        speed++;
                    else
                        speed--;
                }
            }
        }
    } else {
        digitalWrite(H2_SPEED_CTRL, false);
        running=false;
    }
    
    /* update INCLINE functionality
     */
    if(incline_sense_timeout!=0 && millis() > incline_sense_timeout) {
        // took too long to get a pulse, timout incline motion
        if(desired_incline != config.current_incline)
        {
            status_flags |= ST_INCLINE_TIMEOUT;
            desired_incline = config.current_incline;
        }
        incline_sense_timeout=0;
        save_config_timeout = millis() + 5000;   // since incline level changed we must save it to non-volatile memory
    }
    
    // update incline status variable
    if(desired_incline == config.current_incline)
        incline_in_motion=0;
    else if(desired_incline > config.current_incline)
        incline_in_motion=1;
    else if(desired_incline < config.current_incline)
        incline_in_motion=-1;
        
    // update the incline outputs
    digitalWrite(H2_INCLINE, incline_in_motion>0);
    digitalWrite(H2_DECLINE, incline_in_motion<0);
}

void incline_pulse_counter(void)
{
    // this code is simple and would count noise, ensure you have a
    // suitable low-pass filter on the inputs. 1KHz cutoff should do it.
    if(incline_in_motion>0)
        config.current_incline++;
    else if(incline_in_motion<0)
        config.current_incline--;
    unsigned long now = millis();
    incline_sense_timeout = now + INCLINE_SENSE_TIMEOUT;
}
#endif


/****
 ****  Utility functions
 ****/

int clamp(int value, int min, int max)
{
    if(value<min) return min;
    else if(value>max) return max;
    else return value;
}

unsigned long GetOptionMask(String option)
{
    unsigned long opt = 0;
    if(option=="*")
        opt = ~ST_INTERNAL_FLAGS;   // select all non-internal flags
    else if(option=="UPDATE_CLOUD")
        opt |= OPT_UPDATE_CLOUD;
    else if(option=="CLIENT_CONNECTED")
        opt |= ST_CLIENT_CONNECTED;
    else if(option=="NO_CLOUD_WHEN_LOCAL")
        opt |= OPT_NO_CLOUD_WHEN_LOCAL;
    return opt;
}

void updateNetwork()
{
    if(WiFi.status() == WIFI_ON)
    {
        rssi = Network.RSSI();
        strcpy(ssid, Network.SSID());
        IPAddress local = Network.localIP();
        sprintf(ipaddress, "%d.%d.%d.%d:%d", local[0], local[1], local[2], local[3], SERVER_PORT);
    } else {
        strcpy(ssid, "n/a");
        strcpy(ipaddress, "n/a");
        rssi = 0;
    }
}

void loadConfig() {
  // To make sure there are settings, and they are YOURS!
  // If nothing is found it will use the default settings.
  if (EEPROM.read(CONFIG_START + 0) == CONFIG_VERSION[0] &&
      EEPROM.read(CONFIG_START + 1) == CONFIG_VERSION[1] &&
      EEPROM.read(CONFIG_START + 2) == CONFIG_VERSION[2])
    { 
        for (unsigned int t=0; t<sizeof(config); t++)
            *((char*)&config + t) = EEPROM.read(CONFIG_START + t);
        desired_incline = config.current_incline;
    }
}

void saveConfig() {
  for (unsigned int t=0; t<sizeof(config); t++)
    EEPROM.write(CONFIG_START + t, *((char*)&config + t));
}

