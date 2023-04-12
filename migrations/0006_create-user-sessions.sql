-- Migration number: 0006 	 2023-04-11T17:00:38.328Z
DROP INDEX IF EXISTS UserSessionsSessionId;
DROP TABLE IF EXISTS UserSessions;
CREATE TABLE UserSessions (
  id INTEGER PRIMARY KEY,
  userId INT,
  sessionId TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES Users(id)
);
CREATE INDEX UserSessionsSessionId ON UserSessions (sessionId);
