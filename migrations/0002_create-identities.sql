-- Migration number: 0002 	 2023-03-14T21:51:29.533Z
DROP TABLE IF EXISTS Identities;
CREATE TABLE Identities (
  ID INTEGER PRIMARY KEY,
  ProviderID INT,
  UserID INT,
  ProviderIdentityID TEXT,
  FOREIGN KEY (ProviderID) REFERENCES Providers(ID),
  FOREIGN KEY (ID) REFERENCES Users(ID)
);
