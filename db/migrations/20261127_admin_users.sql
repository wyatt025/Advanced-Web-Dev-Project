USE riocinemadb;

GRANT SELECT (id, username, email, phone, role, created_at),
  INSERT (username, email, phone, role, password),
  UPDATE (username, email, phone), DELETE ON riocinemadb.users TO 'role_admin';
