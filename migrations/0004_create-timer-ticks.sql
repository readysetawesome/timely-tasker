-- Migration number: 0004 	 2023-03-15T20:35:41.767Z
DROP INDEX IF EXISTS TimerTicksUserSummary;
DROP TABLE IF EXISTS TimerTicks;
CREATE TABLE TimerTicks (
  ID INTEGER PRIMARY KEY,
  UserID INT,
  TickNumber INT,
  Distracted INT,
  SummaryID INT,
  FOREIGN KEY (SummaryID) REFERENCES Summaries(ID),
  FOREIGN KEY (UserID) REFERENCES Users(ID)
);
CREATE INDEX TimerTicksUserSummary ON TimerTicks (UserID, SummaryID);
