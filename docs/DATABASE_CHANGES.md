# Database Changes

## 2025-07-08: Document Upload Permissions

### Changes
- Granted `INSERT`, `UPDATE`, `DELETE`, `TRIGGER` permissions on `module_documents` table to `authenticated` role
- Allows all authenticated users to upload, modify, and delete module documents (EPP, HSE, etc.)

### Affected Tables
- `module_documents` — Users can now upload and manage documents

### Users Benefited
- `gonzalocanales@lapatagua.cl` — Can now upload EPP documents without restrictions
- All authenticated users — Can now upload module documents

### Query Applied
```sql
GRANT INSERT, UPDATE, DELETE, TRIGGER ON module_documents TO authenticated;
```

### Impact
- ✅ EPP document uploads now work for all users
- ✅ Document management (edit, delete) enabled
- ✅ No application code changes required
