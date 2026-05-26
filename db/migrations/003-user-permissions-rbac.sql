-- User Roles & Permissions RBAC System

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('admin', 'manager', 'technician', 'viewer')) NOT NULL,
  org_id text DEFAULT 'default' NOT NULL,
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, org_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission text NOT NULL,
  org_id text DEFAULT 'default' NOT NULL,
  created_at timestamp DEFAULT now()
);

-- RLS Policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- user_roles policies
CREATE POLICY "user_roles_select" ON user_roles
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.org_id = user_roles.org_id
    )
  );

CREATE POLICY "user_roles_insert" ON user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.org_id = NEW.org_id
    )
  );

CREATE POLICY "user_roles_update" ON user_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.org_id = user_roles.org_id
    )
  );

-- user_permissions policies
CREATE POLICY "user_permissions_select" ON user_permissions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.org_id = user_permissions.org_id
    )
  );

CREATE POLICY "user_permissions_insert" ON user_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.org_id = NEW.org_id
    )
  );

-- Indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_org_id ON user_roles(org_id);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_org_id ON user_permissions(org_id);
