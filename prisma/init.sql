-- Afya Nyumbani Home Care Services Ltd — Healthcare ERP
-- Phase 1: Auth + Finance + Billing/Invoices + Staff Management
-- Applied directly via psql (Prisma CLI cannot reach binaries.prisma.sh in this sandbox)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================= ENUMS =================
CREATE TYPE user_role AS ENUM ('ADMIN', 'STAFF');
CREATE TYPE user_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE profession AS ENUM ('NURSE', 'DOCTOR', 'CHW', 'ADMIN_STAFF');
CREATE TYPE employment_status AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED');
CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE payroll_status AS ENUM ('PENDING', 'PAID');
CREATE TYPE client_type AS ENUM ('INDIVIDUAL', 'CORPORATE', 'INSURANCE');
CREATE TYPE doc_type AS ENUM ('QUOTATION', 'INVOICE', 'PROFORMA', 'TAX_INVOICE');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('CASH', 'MPESA', 'AIRTEL_MONEY', 'MIXX_BY_YAS', 'BANK_TRANSFER');
CREATE TYPE expense_category AS ENUM ('MISHAHARA', 'VIFAA', 'USAFIRI', 'UENDESHAJI', 'MENGINEYO');
CREATE TYPE stock_movement_type AS ENUM ('IN', 'OUT');
CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE home_visit_status AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- ================= USERS (AUTH) =================
CREATE TABLE users (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  phone          TEXT,
  role           user_role NOT NULL,
  status         user_status NOT NULL DEFAULT 'APPROVED',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================= STAFF =================
CREATE TABLE staff (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id              TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_number         TEXT UNIQUE NOT NULL,
  photo_url            TEXT,
  profession           profession NOT NULL,
  license_number       TEXT,
  license_expiry_date  DATE,
  start_date           DATE NOT NULL,
  employment_status    employment_status NOT NULL DEFAULT 'ACTIVE',
  base_salary          DECIMAL(14,2) NOT NULL CHECK (base_salary >= 0),
  allowances           DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (allowances >= 0),
  leave_balance_days    INT NOT NULL DEFAULT 28 CHECK (leave_balance_days >= 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE leave_requests (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  staff_id       TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  days           INT NOT NULL,
  reason         TEXT NOT NULL,
  status         leave_status NOT NULL DEFAULT 'PENDING',
  decided_by_id  TEXT REFERENCES users(id),
  decided_at     TIMESTAMPTZ,
  decision_note  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payrolls (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  staff_id          TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  month             INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year              INT NOT NULL,
  base_salary       DECIMAL(14,2) NOT NULL CHECK (base_salary >= 0),
  allowances        DECIMAL(14,2) NOT NULL DEFAULT 0,
  nssf_deduction    DECIMAL(14,2) NOT NULL DEFAULT 0,
  paye_deduction    DECIMAL(14,2) NOT NULL DEFAULT 0,
  other_deductions  DECIMAL(14,2) NOT NULL DEFAULT 0,
  gross_pay         DECIMAL(14,2) NOT NULL CHECK (gross_pay >= 0),
  net_pay           DECIMAL(14,2) NOT NULL CHECK (net_pay >= 0),
  status            payroll_status NOT NULL DEFAULT 'PENDING',
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, month, year)
);

-- ================= BILLING / INVOICES =================
CREATE TABLE clients (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT,
  type       client_type NOT NULL DEFAULT 'INDIVIDUAL',
  address    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_number   TEXT UNIQUE NOT NULL,
  doc_type          doc_type NOT NULL DEFAULT 'INVOICE',
  client_id         TEXT NOT NULL REFERENCES clients(id),
  issue_date        TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date          TIMESTAMPTZ,
  subtotal          DECIMAL(14,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount        DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount      DECIMAL(14,2) NOT NULL CHECK (total_amount >= 0),
  amount_paid       DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  payment_status    payment_status NOT NULL DEFAULT 'PENDING',
  notes             TEXT,
  converted_from_id TEXT UNIQUE REFERENCES invoices(id),
  created_by_id     TEXT NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invoice_items (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit_price  DECIMAL(14,2) NOT NULL CHECK (unit_price >= 0),
  total       DECIMAL(14,2) NOT NULL CHECK (total >= 0)
);

CREATE TABLE payments (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_id     TEXT NOT NULL REFERENCES invoices(id),
  amount         DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  method         payment_method NOT NULL,
  reference      TEXT,
  notes          TEXT,
  received_by_id TEXT NOT NULL REFERENCES users(id),
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================= FINANCE / EXPENSES =================
CREATE TABLE expenses (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category       expense_category NOT NULL,
  amount         DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  date           DATE NOT NULL,
  description    TEXT NOT NULL,
  created_by_id  TEXT NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================= INVENTORY =================
CREATE TABLE inventory_items (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name           TEXT NOT NULL UNIQUE,
  category       TEXT NOT NULL,
  unit           TEXT NOT NULL,
  reorder_level  INT NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stock_movements (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  item_id        TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type  stock_movement_type NOT NULL,
  quantity       INT NOT NULL CHECK (quantity > 0),
  batch_number   TEXT,
  expiry_date    DATE,
  reference      TEXT,
  notes          TEXT,
  created_by_id  TEXT NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================= PATIENTS (EMR) =================
CREATE TABLE patients (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name               TEXT NOT NULL,
  date_of_birth           DATE,
  gender                  gender_type,
  phone                   TEXT,
  email                   TEXT,
  address                 TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  blood_type              TEXT,
  allergies               TEXT,
  chronic_conditions      TEXT,
  notes                   TEXT,
  created_by_id           TEXT NOT NULL REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patient_medications (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage          TEXT,
  frequency       TEXT,
  start_date      DATE,
  end_date        DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patient_documents (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id     TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  document_type  TEXT NOT NULL,
  notes          TEXT,
  uploaded_by_id TEXT NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================= HOME VISITS =================
CREATE TABLE home_visits (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id        TEXT NOT NULL REFERENCES patients(id),
  staff_id          TEXT REFERENCES staff(id),
  visit_date        DATE NOT NULL,
  status            home_visit_status NOT NULL DEFAULT 'SCHEDULED',
  location          TEXT,
  blood_pressure    TEXT,
  temperature       DECIMAL(4,1),
  pulse             INT CHECK (pulse IS NULL OR pulse > 0),
  weight            DECIMAL(5,2),
  treatment_notes   TEXT,
  notes             TEXT,
  created_by_id     TEXT NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================= AUDIT LOG =================
CREATE TABLE audit_logs (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT NOT NULL REFERENCES users(id),
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  amount     DECIMAL(14,2),
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================= INDEXES =================
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(payment_status);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_payrolls_staff ON payrolls(staff_id);
CREATE INDEX idx_leave_staff ON leave_requests(staff_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_expiry ON stock_movements(expiry_date);
CREATE INDEX idx_inventory_items_name ON inventory_items(name);
CREATE INDEX idx_patient_medications_patient ON patient_medications(patient_id);
CREATE INDEX idx_patient_documents_patient ON patient_documents(patient_id);
CREATE INDEX idx_patients_name ON patients(full_name);
CREATE INDEX idx_home_visits_patient ON home_visits(patient_id);
CREATE INDEX idx_home_visits_staff ON home_visits(staff_id);
CREATE INDEX idx_home_visits_date ON home_visits(visit_date);
