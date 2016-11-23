
INSTALL

To install the required dependancies use the following command:
$ npm install

If websocket complains about 'node not found' add a symlink from nodejs executable to node. Node renamed the 'node' executable to 'nodejs' at some point
which breaks some packages.

$ which nodejs					-- tell me where nodejs is (probably /usr/bin)
$ ln -s /usr/bin/nodejs /usr/bin/node		-- link from nodejs in found directory to node


SETTING UP MySQL

See the /schema directory for necessary schema files. To create a fresh treadstation database and standard login user execute the following command:

mysql -uroot -p<password> < schema/treadstation.sql


RUNNING

To run simply call nodejs for the executable. You may need to edit the tread-station.js file to specify the listen-on ip:port. After tread-station is 
running then connect from the Mac dashboard app or from the web based client.

$ nodejs tread-station.js


RUNNING as a SERVICE

Tread-station can run as a service using the Linux systemctl command. This will ensure that tread-station service is run on startup.

To stop or start the service:
sudo systemctl stop|start tread-station.service

The service must first be installed by linking the tread-station.service description file into the /etc/systemd directory:
ln -s <tread-station-root-dir>/nodejs/tread-station.service /etc/systemd/system/tread-station.service


SCREENSAVER

You probably want to enable the screensaver. At some point I would like the service to automatically do this. For now the commands are:

First, set the display the screensaver will run on:
  export DISPLAY=:0.0

Now run screensaver commands:
  xset s on  - enable the screensaver
  xset s blank  - blank the screen now (touch a key to return)
  xset s activate  - activate the screensaver now
  xset s 60  - set the timeout on the screensaver
  xset s reset  - reset the timer back to the timeout value

