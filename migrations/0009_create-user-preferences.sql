-- Migration number: 0009	 2026-03-12
CREATE TABLE UserPreferences (
  id INTEGER PRIMARY KEY,
  userId INTEGER UNIQUE NOT NULL,
  preferences TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (userId) REFERENCES Users(id)
);
