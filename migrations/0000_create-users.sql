-- Migration number: 0000 	 2023-03-14T21:51:13.486Z
DROP TABLE IF EXISTS Users;
CREATE TABLE Users (
  ID INTEGER PRIMARY KEY,
  DisplayName TEXT,
  Email TEXT
);