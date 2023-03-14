-- Migration number: 0001 	 2023-03-14T21:56:48.721Z
DROP TABLE IF EXISTS Providers;
CREATE TABLE Providers (
  ID INT,
  ProviderName TEXT,
  CFProviderID TEXT,
  PRIMARY KEY (ID)
);
