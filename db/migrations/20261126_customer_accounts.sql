USE riocinemadb;

GRANT SELECT (id, username, password, role)
  ON riocinemadb.users TO 'role_auth';
GRANT INSERT (username, password)
  ON riocinemadb.users TO 'role_auth';

GRANT 'role_public' TO 'role_registered';
GRANT SELECT (id, username)
  ON riocinemadb.users TO 'role_registered';
GRANT 'role_registered' TO 'app_registered'@'%';

SET DEFAULT ROLE ALL TO
  'app_auth'@'%', 'app_registered'@'%';
