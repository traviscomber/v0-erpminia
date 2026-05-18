# Admin User Management - Simple Guide

## Overview
The admin panel provides a simple interface to manage users, with the ability to create, edit roles, and delete users.

---

## Access the Admin Panel
**URL:** `/dashboard/admin/users`

**Requirements:**
- Must be logged in as `admin` or `superadmin` role
- Only admins can access this section

---

## Creating a New User

### Step 1: Fill in the form
- **Email:** User email (must be unique)
- **Nombre Completo:** Full name
- **Contraseña:** Must contain:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one number
  - At least one special character (!@#$%^&*)
- **Rol:** Select user role

### Step 2: Click "Crear Usuario"
- If successful, form clears and shows success message
- User appears in the list below

### Available Roles
1. **admin** - Full system access
2. **manager** - Operations & approvals
3. **technician** - Maintenance & documents
4. **warehouse_staff** - Warehouse & inventory
5. **finance_officer** - Finance & purchases
6. **viewer** - Read-only access

---

## Managing Existing Users

### View All Users
- See list of all registered users
- Shows: Email, Name, Role, Status, Last Access

### Search Users
- Use the search box to filter by email or name
- Updates list in real-time

### Edit User Role
1. Click the edit icon (pencil) next to user
2. Select new role from dropdown
3. Role updates immediately

### Delete/Close a User
1. Click the trash icon (red) next to user
2. Confirm deletion
3. User is removed from system immediately

---

## Technical Details

### API Endpoints
- **GET** `/api/admin/users` - List all users
- **POST** `/api/admin/users` - Create new user
- **PATCH** `/api/admin/users` - Update user role
- **DELETE** `/api/admin/users` - Delete user

### Response Formats
```json
{
  "id": "1",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "manager",
  "created_at": "2024-05-18T...",
  "email_confirmed_at": "2024-05-18T...",
  "last_sign_in_at": null
}
```

---

## Demo User
**Email:** admin@example.com
**Role:** admin

---

## Quick Actions
1. **Create User:** 2 minutes
2. **Change Role:** 30 seconds
3. **Delete User:** 10 seconds (with confirmation)

---

## Status: ✅ OPERATIONAL
All user management features are fully functional and ready for production use.
