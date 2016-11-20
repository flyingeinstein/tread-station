
# create the user
#CREATE USER 'tread'@'localhost' IDENTIFIED BY 'peps1c0la';
GRANT SELECT,INSERT,UPDATE,DELETE ON treadstation.* TO 'tread'@'localhost' IDENTIFIED BY 'peps1c0la';
FLUSH PRIVILEGES;

