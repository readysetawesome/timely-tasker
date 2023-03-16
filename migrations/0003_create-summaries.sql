-- Migration number: 0003 	 2023-03-15T20:45:37.500Z
DROP INDEX IF EXISTS SummariesUserDate;
DROP TABLE IF EXISTS Summaries;
CREATE TABLE Summaries (
  ID INTEGER PRIMARY KEY,
  UserID INT,
  Content TEXT,
  Date DATE,
  Slot INT, -- order of the list item
  FOREIGN KEY (UserID) REFERENCES Users(ID)
);
CREATE INDEX SummariesUserDate ON Summaries (UserID, Date);
