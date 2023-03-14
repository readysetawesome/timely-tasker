-- Migration number: 0002 	 2023-03-14T21:51:29.533Z
DROP TABLE IF EXISTS Identities;
CREATE TABLE Identities (
  ID INT,
  ProviderID INT,
  UserID INT,
  ProviderIdentityID TEXT,
  PRIMARY KEY (ID),
  FOREIGN KEY (ProviderID) REFERENCES Providers(ID),
  FOREIGN KEY (UserID) REFERENCES Users(ID)
);
