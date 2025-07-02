-- Query to check the columns in EmployeeCostSummary view
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'EmployeeCostSummary'
ORDER BY 
    ordinal_position;

-- Alternative query using PostgreSQL system catalogs
-- This will show the actual view definition
SELECT 
    pg_get_viewdef('public."EmployeeCostSummary"'::regclass, true) as view_definition;