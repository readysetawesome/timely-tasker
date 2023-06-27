-- Migration number: 0008 	 2023-06-27T01:12:49.962Z
CREATE UNIQUE INDEX TimerTicksUserSummaryOrder ON Summaries (userId, date, slot);
