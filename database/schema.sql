-- SmartSeason Field Monitoring System
-- Database Schema for PostgreSQL (Neon DB compatible)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,
  role          VARCHAR(20)   NOT NULL CHECK (role IN ('admin', 'agent')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FIELDS TABLE
-- ============================================================
CREATE TABLE fields (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(150)  NOT NULL,
  crop_type    VARCHAR(100)  NOT NULL,
  planting_date DATE         NOT NULL,
  location     VARCHAR(255),
  size_hectares NUMERIC(10, 2),
  stage        VARCHAR(20)   NOT NULL DEFAULT 'planted'
               CHECK (stage IN ('planted', 'growing', 'ready', 'harvested')),
  assigned_to  UUID          REFERENCES users(id) ON DELETE SET NULL,
  created_by   UUID          NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FIELD UPDATES TABLE
-- Tracks every stage change and observation note
-- ============================================================
CREATE TABLE field_updates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id    UUID          NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  agent_id    UUID          NOT NULL REFERENCES users(id),
  stage       VARCHAR(20)   NOT NULL
              CHECK (stage IN ('planted', 'growing', 'ready', 'harvested')),
  notes       TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_fields_assigned_to  ON fields(assigned_to);
CREATE INDEX idx_fields_stage        ON fields(stage);
CREATE INDEX idx_field_updates_field ON field_updates(field_id);
CREATE INDEX idx_field_updates_agent ON field_updates(agent_id);
CREATE INDEX idx_users_email         ON users(email);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_fields_updated_at
  BEFORE UPDATE ON fields
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED DATA — demo credentials (passwords are bcrypt hashed)
-- Admin password : Admin@123
-- Agent password : Agent@123
-- ============================================================
INSERT INTO users (id, name, email, password_hash, role) VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Sarah Ochieng',
    'admin@smartseason.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhbe/R.er6LTXpHGqC4lQq',
    'admin'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'James Mwangi',
    'agent@smartseason.com',
    '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC..og/PZzU.rS9IJWnm',
    'agent'
  );

INSERT INTO fields (name, crop_type, planting_date, location, size_hectares, stage, assigned_to, created_by) VALUES
  ('Rift Valley Plot A', 'Maize',   '2026-01-15', 'Nakuru, Kenya', 5.5,  'growing',   'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'),
  ('Kiambu North',       'Tea',     '2025-11-01', 'Kiambu, Kenya', 12.0, 'ready',     'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'),
  ('Meru Highlands',     'Coffee',  '2026-02-20', 'Meru, Kenya',   8.0,  'planted',   'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'),
  ('Kakamega West',      'Sugarcane','2025-08-10','Kakamega, Kenya',20.0, 'harvested', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001');
