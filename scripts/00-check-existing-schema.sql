-- Diagnostic: Check existing schema
-- List all tables in the public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check existing columns in production-related tables
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name LIKE '%equipment%'
ORDER BY table_name, column_name;

-- Check for sensor_readings table
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'sensor_readings'
ORDER BY column_name;
