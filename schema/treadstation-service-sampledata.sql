
-- create two sample users
LOCK TABLES `users` WRITE;
INSERT INTO `users` VALUES 
    (1,'User1','1985-01-01',68,172,1800,NULL),
    (2,'User2','1985-01-01',68,172,1800,NULL);
UNLOCK TABLES;

