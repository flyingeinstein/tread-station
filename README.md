Tread Station
=============

Wirelessly control your treadmill, replace the old lackluster dashboard with graphics and workout analytics! Replace the dashboard with a monitor and add a small computer and you have a Treadmill Workstation.

This project is implemented using hardware wired to a RaspberryPi, BeagleBoard or other Linux device running this nodejs project. A React web client provides the treadmill control interface and can be served from the same RPi or BBB using Apache or any simple web server or can also be served remotely and connect to the hardware node.

You may also find some deprecated projects in older branches such as Spark based hardware control, AngularJS based web interface, and MacOS widget control. These dont work well for one reason or another but they are there if you are bored.

ABOUT ME
I've replaced my old treadmill dashboard with a 27" monitor and hooked it up to a Mac Mini. My keyboard, mouse and touchpad are all wireless. This is sweet! A workstation without the wires and controllable via a web page. This should help get me back to health. Already I feel more energy, and more creativity as I work a difficult day job that requires me to be at the computer long periods of time.

Directories
===========
Refer to the README.md in each of these directories for more information.
  * nodejs - the control software for BeagleBoard Black devices (http://beagleboard.org/black)
  * ui - Web user interface based on React and D3D.js. Works in any remote browser or in kiosk mode on BeagleBone Black with touch LCD

*Deprecated Code* (found in old branches)
  * mac - a Mac OSX widget 
  * spark - control firmware on particle.io (spark.io) boards (this platform never worked well, buggy network protocols caused intermittent freezing)
  * particle - part of the spark implementation
  * uExpect - small C websockets implementation (was used for spark platform)


Features
========
  * Controls both speed and incline
  * morphs speed to the desired speed, no fast changes
  * supports lidar or sonar sensor for adjusting speed automatically to sustain your position on the platform (beta)
  * contains soft limit for testing (reduces max speed)
  * supports multiple users
  * logs data to a mysql database (would be easy to add support for another db like influx)
  * you can make your own API calls to control or get status

Upcoming Features
=================
  * measures pulses from a hall-effect sensor and uses a rolling average
        currently my reed switch sensor on my treadmill appears broken, so I did not implement this right away.
  * HomeAutomation integration

Issues
======
  * still refining the logic control for the autopace feature (sonar/lidar auto speed). It works and is useable but could be smarter.


Electronics
===========

LOW PASS FILTERS:
  Let's talk about low pass filters. :)  The treadmill controller generates a lot of noise on the signals, both the speed
  signal and the incline sense. It is important to filter out this noise if we are going to get nice clean signals into
  our spark. This is pretty easy since the noise is of a high frequency and our signals are all well under 1kHz. We could
  use complicated code to debounce the inputs, but why risk introducing bugs and make the code unreadable when a simple
  resistor and capacitor will do?
  
  You need to add low pass filters on all input signals and the speed output signal. The speed output already has a 290ohm
  resistor as a current limit, so a 0.22uF capacitor will do here. For simplicity you can also use the same 290ohm and 0.22uF
  cap on the other lines. This will keep a good low-impedance connection between the signal transmitter and receiver.
  
  I assume your spark controller and the MC2100 is seperated by a long cable, where possible put the filter closest to the
  input/receiver side. That means near the MC2100 for the speed output and at the spark for the sense inputs.
  
  A good low-pass resistor-capacitor calculator can be found here:
  http://www.learningaboutelectronics.com/Articles/Low-pass-filter-calculator.php#answer1
  
