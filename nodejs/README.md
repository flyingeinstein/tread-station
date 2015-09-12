
INSTALL

To install the required dependancies use the following command:
$ npm install

If websocket complains about 'node not found' add a symlink from nodejs executable to node. Node renamed the 'node' executable to 'nodejs' at some point
which breaks some packages.

$ which nodejs					-- tell me where nodejs is (probably /usr/bin)
$ ln -s /usr/bin/nodejs /usr/bin/node		-- link from nodejs in found directory to node


RUNNING

To run simply call nodejs for the executable. You may need to edit the tread-station.js file to specify the listen-on ip:port. After tread-station is 
running then connect from the Mac dashboard app or from the web based client.

$ nodejs tread-station.js

