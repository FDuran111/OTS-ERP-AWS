SELECT 
  n.nspname AS schema,
  t.typname AS type_name,
  string_agg(e.enumlabel::text, ',' ORDER BY e.enumsortorder) AS labels
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
LEFT JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname = 'public' 
  AND t.typtype = 'e'
GROUP BY n.nspname, t.typname
ORDER BY t.typname;
