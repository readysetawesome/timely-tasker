-- Migration number: 0005 	 2023-03-30T16:15:15.857Z

ALTER TABLE Users RENAME ID TO id;
ALTER TABLE Users RENAME DisplayName TO displayName;
ALTER TABLE Users RENAME Email TO email;
ALTER TABLE Providers RENAME ID TO id;
ALTER TABLE Providers RENAME ProviderName TO providerName;
ALTER TABLE Providers RENAME CFProviderID TO cfProviderId;
ALTER TABLE Identities RENAME ID TO id;
ALTER TABLE Identities RENAME ProviderID TO providerId;
ALTER TABLE Identities RENAME UserID TO userId;
ALTER TABLE Identities RENAME ProviderIdentityID TO providerIdentityId;
ALTER TABLE Summaries RENAME ID TO id;
ALTER TABLE Summaries RENAME UserID TO userId;
ALTER TABLE Summaries RENAME content TO content;
ALTER TABLE Summaries RENAME Date TO date;
ALTER TABLE Summaries RENAME Slot TO slot;
ALTER TABLE TimerTicks RENAME ID TO id;
ALTER TABLE TimerTicks RENAME UserID TO userId;
ALTER TABLE TimerTicks RENAME TickNumber TO tickNumber;
ALTER TABLE TimerTicks RENAME Distracted TO distracted;
ALTER TABLE TimerTicks RENAME SummaryID TO summaryId;
