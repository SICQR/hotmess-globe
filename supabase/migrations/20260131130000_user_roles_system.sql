-- ============================================================================
-- USER ROLES SYSTEM
-- Derives stackable roles from existing data
-- Roles: social, buyer, seller, creator, organiser
-- ============================================================================

-- Create user_roles table for explicit role assignments + overrides
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('social', 'buyer', 'seller', 'creator', 'organiser')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID REFERENCES "User"(id), -- NULL = system-derived
  is_verified BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, role)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view others roles"
  ON user_roles FOR SELECT
  USING (true); -- Roles are public info

CREATE POLICY "Service role full access"
  ON user_roles FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- VIEW: Computed roles based on activity
-- ============================================================================
CREATE OR REPLACE VIEW user_roles_computed AS
SELECT 
  u.id AS user_id,
  -- Everyone has social role
  true AS is_social,
  -- Buyer: has orders or cart items
  EXISTS (
    SELECT 1 FROM orders o WHERE o.buyer_id = u.id
    UNION
    SELECT 1 FROM cart_items ci WHERE ci.user_id = u.id
  ) AS is_buyer,
  -- Seller: has products listed
  EXISTS (
    SELECT 1 FROM products p WHERE p.seller_id = u.id AND p.status = 'active'
  ) AS is_seller,
  -- Creator: explicit flag on User table
  COALESCE(u.is_creator, false) AS is_creator,
  -- Organiser: has events or beacons
  EXISTS (
    SELECT 1 FROM "Beacon" b WHERE b.creator_id = u.id
  ) AS is_organiser
FROM "User" u;

-- ============================================================================
-- FUNCTION: Get all roles for a user (explicit + computed)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE (
  role TEXT,
  is_verified BOOLEAN,
  source TEXT -- 'explicit' or 'computed'
) AS $$
BEGIN
  -- Return explicit roles
  RETURN QUERY
  SELECT 
    ur.role,
    ur.is_verified,
    'explicit'::TEXT AS source
  FROM user_roles ur
  WHERE ur.user_id = p_user_id;
  
  -- Return computed roles (if not already explicit)
  RETURN QUERY
  SELECT 
    r.role,
    false AS is_verified,
    'computed'::TEXT AS source
  FROM (
    SELECT 'social' AS role WHERE EXISTS (SELECT 1 FROM "User" WHERE id = p_user_id)
    UNION ALL
    SELECT 'buyer' WHERE EXISTS (
      SELECT 1 FROM orders WHERE buyer_id = p_user_id
      UNION SELECT 1 FROM cart_items WHERE user_id = p_user_id
    )
    UNION ALL
    SELECT 'seller' WHERE EXISTS (
      SELECT 1 FROM products WHERE seller_id = p_user_id AND status = 'active'
    )
    UNION ALL
    SELECT 'creator' WHERE EXISTS (
      SELECT 1 FROM "User" WHERE id = p_user_id AND is_creator = true
    )
    UNION ALL
    SELECT 'organiser' WHERE EXISTS (
      SELECT 1 FROM "Beacon" WHERE creator_id = p_user_id
    )
  ) r
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p_user_id AND ur.role = r.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Grant role to user
-- ============================================================================
CREATE OR REPLACE FUNCTION grant_user_role(
  p_user_id UUID,
  p_role TEXT,
  p_granted_by UUID DEFAULT NULL,
  p_verified BOOLEAN DEFAULT false
)
RETURNS user_roles AS $$
DECLARE
  v_result user_roles;
BEGIN
  INSERT INTO user_roles (user_id, role, granted_by, is_verified)
  VALUES (p_user_id, p_role, p_granted_by, p_verified)
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    is_verified = COALESCE(p_verified, user_roles.is_verified),
    granted_by = COALESCE(p_granted_by, user_roles.granted_by)
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Revoke role from user
-- ============================================================================
CREATE OR REPLACE FUNCTION revoke_user_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM user_roles 
  WHERE user_id = p_user_id AND role = p_role;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Check if user has role
-- ============================================================================
CREATE OR REPLACE FUNCTION user_has_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check explicit first
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = p_role) THEN
    RETURN true;
  END IF;
  
  -- Check computed
  CASE p_role
    WHEN 'social' THEN
      RETURN EXISTS (SELECT 1 FROM "User" WHERE id = p_user_id);
    WHEN 'buyer' THEN
      RETURN EXISTS (
        SELECT 1 FROM orders WHERE buyer_id = p_user_id
        UNION SELECT 1 FROM cart_items WHERE user_id = p_user_id
      );
    WHEN 'seller' THEN
      RETURN EXISTS (
        SELECT 1 FROM products WHERE seller_id = p_user_id AND status = 'active'
      );
    WHEN 'creator' THEN
      RETURN EXISTS (
        SELECT 1 FROM "User" WHERE id = p_user_id AND is_creator = true
      );
    WHEN 'organiser' THEN
      RETURN EXISTS (
        SELECT 1 FROM "Beacon" WHERE creator_id = p_user_id
      );
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
