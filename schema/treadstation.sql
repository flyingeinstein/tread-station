create database treadstation;

# create the user
#CREATE USER 'tread'@'localhost' IDENTIFIED BY 'peps1c0la';
GRANT SELECT,INSERT,UPDATE,DELETE ON treadstation.* TO 'tread'@'localhost' IDENTIFIED BY 'peps1c0la';

DROP TABLE IF EXISTS `runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `runs` (
  `session` int(10) unsigned NOT NULL,
  `user` smallint(5) unsigned NOT NULL,
  `ts` int(10) unsigned NOT NULL,
  `lastUpdate` int(10) unsigned NOT NULL,
  `runningTime` int(10) unsigned NOT NULL COMMENT 'seconds',
  `distance` float NOT NULL,
  `track` smallint(5) unsigned NOT NULL DEFAULT '0',
  `laps` smallint(5) unsigned NOT NULL DEFAULT '0',
  `goaltime` int(10) unsigned DEFAULT NULL COMMENT 'seconds',
  `goaldistance` float DEFAULT NULL COMMENT 'kilometers',
  `avgmets` float DEFAULT NULL,
  `avgspeed` float DEFAULT NULL COMMENT 'm/s',
  `maxspeed` float DEFAULT NULL COMMENT 'm/s',
  `avgincline` float DEFAULT NULL COMMENT 'degrees',
  `maxincline` float DEFAULT NULL COMMENT 'degrees',
  PRIMARY KEY (`session`,`user`,`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `userid` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `birthdate` date DEFAULT NULL,
  `weight` float DEFAULT NULL COMMENT ' kilograms',
  `height` float DEFAULT NULL COMMENT 'centimeters',
  `goaltime` int(10) unsigned DEFAULT '5400',
  `goaldistance` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`userid`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `weight`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `weight` (
  `userid` int(10) unsigned NOT NULL,
  `ts` int(10) unsigned NOT NULL,
  `weight` float NOT NULL COMMENT 'kilograms'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

