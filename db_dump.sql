CREATE DATABASE  IF NOT EXISTS `chatapp` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `chatapp`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: chatapp
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `message_reactions`
--

DROP TABLE IF EXISTS `message_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_reactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `username` varchar(50) NOT NULL,
  `emoji` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_reaction` (`message_id`,`username`),
  CONSTRAINT `message_reactions_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_reactions`
--

LOCK TABLES `message_reactions` WRITE;
/*!40000 ALTER TABLE `message_reactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `message_reactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_seen`
--

DROP TABLE IF EXISTS `message_seen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_seen` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `username` varchar(50) NOT NULL,
  `seen_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_seen` (`message_id`,`username`),
  CONSTRAINT `message_seen_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_seen`
--

LOCK TABLES `message_seen` WRITE;
/*!40000 ALTER TABLE `message_seen` DISABLE KEYS */;
INSERT INTO `message_seen` VALUES (1,98,'Ankan','2026-07-15 08:50:24'),(2,99,'Archi','2026-07-15 08:50:29'),(3,102,'Ankan','2026-07-15 08:55:09'),(4,111,'Archi','2026-07-15 09:21:31'),(5,113,'Archi','2026-07-15 09:21:58'),(6,121,'Ankan','2026-07-15 09:27:37'),(7,126,'Ankan','2026-07-15 09:32:29'),(8,131,'Archi','2026-07-15 09:35:13'),(9,137,'Archi','2026-07-15 09:39:51'),(10,138,'Ankan','2026-07-15 09:39:58'),(11,150,'Archi','2026-07-15 09:56:58'),(12,151,'Archi','2026-07-15 09:57:00'),(13,152,'Archi','2026-07-15 09:57:40');
/*!40000 ALTER TABLE `message_seen` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `room` varchar(100) NOT NULL,
  `message` text NOT NULL,
  `type` enum('message','notification') DEFAULT 'message',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=153 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (95,'Archi','0000','Archi joined the room','notification','2026-07-15 08:42:09',0),(96,'Ankan','2589','Ankan joined the room','notification','2026-07-15 08:49:48',0),(97,'Ankan','0000','Ankan joined the room','notification','2026-07-15 08:50:19',0),(98,'Archi','0000','816xtiW0vzxt+f7S3nBHAfC3GCbYIpTFEVXFa1Y3','message','2026-07-15 08:50:24',0),(99,'Ankan','0000','HL7nAEdTnVC/AxBuDD//UUyajfdZ/Tnn7Ka4NgeK+6bV','message','2026-07-15 08:50:29',0),(100,'Ankan','0000','Ankan joined the room','notification','2026-07-15 08:54:37',0),(101,'Archi','0000','Archi joined the room','notification','2026-07-15 08:55:04',0),(102,'Archi','0000','+dZ+veQTWEsT+f2nGulC+NH11WigyNVd3oSHcZ9L','message','2026-07-15 08:55:09',0),(103,'Archi','1234','Archi joined the room','notification','2026-07-15 08:55:27',0),(104,'Ankan','2589','Ankan joined the room','notification','2026-07-15 08:55:41',0),(105,'Ankan','7896','Ankan joined the room','notification','2026-07-15 08:55:52',0),(106,'Archi','7896','Archi joined the room','notification','2026-07-15 08:56:26',0),(107,'Ankit','0000','Ankit joined the room','notification','2026-07-15 09:10:58',0),(108,'Ankit','IFLG9YQ','Ankit joined the room','notification','2026-07-15 09:16:51',0),(109,'Archi','IFLG9YQ','Archi joined the room','notification','2026-07-15 09:17:19',0),(110,'Ankit','NE2HCE4','Ankit joined the room','notification','2026-07-15 09:20:01',0),(111,'Ankit','1234','04DLYrLuNKuo1Rfgb6f2tmkyKJ2wnG7mO4fpv2kx8Gg=','message','2026-07-15 09:21:31',0),(112,'Ankit','1234','Ankit joined the room','notification','2026-07-15 09:21:51',0),(113,'Ankit','1234','DunCbRs+HkAM9sT1a/ftWiFqYZKoG5rmwHooECZ0KtE=','message','2026-07-15 09:21:58',0),(114,'Archi','1234','Archi joined the room','notification','2026-07-15 09:22:22',0),(115,'Ankit','1234','Ankit joined the room','notification','2026-07-15 09:22:22',0),(116,'Ankan','7896','Ankan joined the room','notification','2026-07-15 09:22:25',0),(117,'Archi','CZJVHYI','Archi joined the room','notification','2026-07-15 09:23:01',0),(118,'Ankan','CZJVHYI','Ankan joined the room','notification','2026-07-15 09:23:36',0),(119,'Ankan','7DK9SS4','Ankan joined the room','notification','2026-07-15 09:27:06',0),(120,'Archi','7DK9SS4','Archi joined the room','notification','2026-07-15 09:27:34',0),(121,'Archi','7DK9SS4','iZhR4EPqCosuM78Ds3ro3x9NuN+q8RZ0EQtBd2qv','message','2026-07-15 09:27:37',0),(122,'Archi','52RZZWE','Archi joined the room','notification','2026-07-15 09:29:14',0),(123,'Ankan','52RZZWE','Ankan joined the room','notification','2026-07-15 09:29:30',0),(124,'Ankan','ZC5E87I','Ankan joined the room','notification','2026-07-15 09:32:11',0),(125,'Archi','ZC5E87I','Archi joined the room','notification','2026-07-15 09:32:24',0),(126,'Archi','ZC5E87I','N3lYxuZYNqhxCDl/aAHQoallSDbr4bbFd3ZAt9++gXs=','message','2026-07-15 09:32:29',0),(127,'Ankan','ZC5E87I','Ankan joined the room','notification','2026-07-15 09:34:17',0),(128,'Archi','BOC3CQE','Archi joined the room','notification','2026-07-15 09:34:48',0),(129,'Ankan','ZC5E87I','Ankan joined the room','notification','2026-07-15 09:34:49',0),(130,'Ankan','BOC3CQE','Ankan joined the room','notification','2026-07-15 09:35:10',0),(131,'Ankan','BOC3CQE','NlPxVE7i7XJHG64eWjJL5alYzGMlQbCodA4TDXophQ==','message','2026-07-15 09:35:13',0),(132,'Ankan','CZJVHYI','Ankan joined the room','notification','2026-07-15 09:36:21',0),(133,'Archi','CZJVHYI','Archi joined the room','notification','2026-07-15 09:36:29',0),(134,'Archi','**96','Archi joined the room','notification','2026-07-15 09:36:40',0),(135,'Ankan','FE51P73','Ankan joined the room','notification','2026-07-15 09:39:32',0),(136,'Archi','FE51P73','Archi joined the room','notification','2026-07-15 09:39:48',0),(137,'Ankan','FE51P73','ClAYIU3nDSqG3rNCmY5o4/wqpbH42fm0fBVjKaKs','message','2026-07-15 09:39:51',0),(138,'Archi','FE51P73','ZQ3fdouITOEeQGbkD4MqoFNOzqKpIROIxLZYeQ8O7RXKVg==','message','2026-07-15 09:39:58',0),(139,'Ankan','2589','Ankan joined the room','notification','2026-07-15 09:40:28',0),(140,'Ankan','52RZZWE','Ankan joined the room','notification','2026-07-15 09:41:59',0),(141,'Ankan','52RZZWE','Ankan left the room','notification','2026-07-15 09:42:01',0),(142,'Ankan','CZJVHYI','Ankan left the room','notification','2026-07-15 09:42:03',0),(143,'Ankan','2589','Ankan left the room','notification','2026-07-15 09:42:11',0),(144,'Ankan','2589','Ankan left the room','notification','2026-07-15 09:42:11',0),(145,'Ankan','A3X37OD','Ankan joined the room','notification','2026-07-15 09:46:03',0),(146,'Archi','0000','Archi joined the room','notification','2026-07-15 09:46:57',0),(147,'Archi','1234','Archi joined the room','notification','2026-07-15 09:55:47',0),(148,'Archi','1234','QmnLnK62SE6B8WnRX08gYQoD547LzihXjPGyKMR+','message','2026-07-15 09:56:05',1),(149,'Ankan','1234','Ankan joined the room','notification','2026-07-15 09:56:22',0),(150,'Ankan','1234','LseHvtG2URfQSitqPVL9oNiqCxBvRY29UaSbDlkt/Oo=','message','2026-07-15 09:56:58',1),(151,'Ankan','1234','wZakQ21lkIFqhDITKbF6VmF1pZmlhGpu5cpSjgQyBJsO','message','2026-07-15 09:57:00',1),(152,'Ankan','1234','uWVS9tUHahMvrYhpDBM5w8MMqNvtKTieqjxkKZwubg==','message','2026-07-15 09:57:40',1);
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `room_invites`
--

DROP TABLE IF EXISTS `room_invites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_invites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `from_username` varchar(50) NOT NULL,
  `to_username` varchar(50) NOT NULL,
  `room` varchar(50) NOT NULL,
  `status` enum('pending','accepted','declined') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_invite` (`to_username`,`room`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `room_invites`
--

LOCK TABLES `room_invites` WRITE;
/*!40000 ALTER TABLE `room_invites` DISABLE KEYS */;
INSERT INTO `room_invites` VALUES (1,'Ankan','Archi','0000','declined','2026-07-15 08:55:18'),(2,'Archi','Ankan','1234','declined','2026-07-15 08:55:35'),(3,'Ankan','Archi','7896','accepted','2026-07-15 08:55:59'),(4,'Ankit','Archi','IFLG9YQ','accepted','2026-07-15 09:16:57'),(5,'Ankit','Archi','NE2HCE4','accepted','2026-07-15 09:20:11'),(6,'Archi','Ankit','1234','accepted','2026-07-15 09:20:58'),(7,'Archi','Ankan','CZJVHYI','accepted','2026-07-15 09:23:07'),(8,'Ankan','Archi','7DK9SS4','accepted','2026-07-15 09:27:28'),(9,'Archi','Ankan','52RZZWE','accepted','2026-07-15 09:29:20'),(10,'Ankan','Archi','ZC5E87I','accepted','2026-07-15 09:32:16'),(11,'Archi','Ankan','BOC3CQE','accepted','2026-07-15 09:35:00'),(12,'Archi','Ankan','BOC3CQE','declined','2026-07-15 09:35:40');
/*!40000 ALTER TABLE `room_invites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_rooms`
--

DROP TABLE IF EXISTS `user_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `room` varchar(50) NOT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_room` (`username`,`room`)
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_rooms`
--

LOCK TABLES `user_rooms` WRITE;
/*!40000 ALTER TABLE `user_rooms` DISABLE KEYS */;
INSERT INTO `user_rooms` VALUES (1,'Archi','0000','2026-07-15 08:42:09'),(15,'Archi','1234','2026-07-15 08:55:27'),(21,'Archi','7896','2026-07-15 08:56:26'),(33,'Ankit','0000','2026-07-15 09:10:58'),(35,'Ankit','IFLG9YQ','2026-07-15 09:16:51'),(36,'Archi','IFLG9YQ','2026-07-15 09:17:19'),(48,'Ankit','NE2HCE4','2026-07-15 09:20:01'),(53,'Ankit','1234','2026-07-15 09:21:51'),(58,'Archi','CZJVHYI','2026-07-15 09:23:01'),(62,'Archi','7DK9SS4','2026-07-15 09:27:34'),(63,'Archi','52RZZWE','2026-07-15 09:29:14'),(68,'Archi','ZC5E87I','2026-07-15 09:32:24'),(70,'Archi','BOC3CQE','2026-07-15 09:34:48'),(89,'Archi','**96','2026-07-15 09:36:40'),(98,'Archi','FE51P73','2026-07-15 09:39:48'),(110,'Ankan','A3X37OD','2026-07-15 09:46:03'),(125,'Ankan','1234','2026-07-15 09:56:22');
/*!40000 ALTER TABLE `user_rooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `reset_token` varchar(100) DEFAULT NULL,
  `reset_expires` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Archi','Archi@gmail.com','$2b$10$Ok9VWTi.9hKICQ0d1rL6aeSaMPGC6E60eapNmcPFMO9KqBZLYFwN2','15edcfdc24f09b77583961591fa5e0a36ec54cf347c81f6d0092c63818bae4e0',1784114135241,'2026-07-15 08:41:57'),(2,'Ankan','ankan@gmail.com','$2b$10$WcnAlN4wMbYQfbtAYd.Aeect2CKpqvgjGoebFzoeCjbq.JO1zgelm',NULL,NULL,'2026-07-15 08:49:33'),(3,'Ankit','ankit@gmail.com','$2b$10$Q9MEyHYQS/pNU0d9HvMe9OqjYz6HNITpnGaQrF34PilcFBLFfpcL6',NULL,NULL,'2026-07-15 09:06:43');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'chatapp'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-15 15:58:02
