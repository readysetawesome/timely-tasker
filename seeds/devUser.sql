INSERT INTO Users (email, displayName)
  VALUES ('cbecker333@gmail.com', 'cbecker333@gmail.com');
INSERT INTO Identities (userId, providerId, providerIdentityId)
  VALUES (last_insert_rowid(), (SELECT id FROM Providers WHERE providerName = 'google'), '999999999');
