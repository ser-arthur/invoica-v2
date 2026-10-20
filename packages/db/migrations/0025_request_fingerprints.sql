-- A new client, saved item or tax code keeps a digest of the request that made it with its request key. The same
-- request again changes nothing; one corrected between a lost answer and the second press is saved as corrected,
-- as a draft is.
alter table client add column request_fingerprint text;
alter table item add column request_fingerprint text;
alter table tax_code add column request_fingerprint text;
