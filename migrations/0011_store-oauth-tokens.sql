-- Migration number: 0011 	 2026-07-12
DROP TABLE IF EXISTS OAuthTokens;
CREATE TABLE OAuthTokens (
  id INTEGER PRIMARY KEY,
  userId INT NOT NULL,
  provider TEXT NOT NULL,
  accessToken TEXT NOT NULL,
  refreshToken TEXT,
  expiresAt INTEGER NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES Users(id),
  UNIQUE(userId, provider)
);

CREATE INDEX OAuthTokensUser ON OAuthTokens (userId);
