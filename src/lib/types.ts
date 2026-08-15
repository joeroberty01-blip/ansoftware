// Types mirror the snake_case Postgres columns in prisma/init.sql exactly,
// so raw query rows can be typed without a mapping layer.

export type UserRole = "ADMIN" | "STAFF";
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type Profession = "NURSE" | "DOCTOR" | "CHW" | "ADMIN_STAFF";
export type EmploymentStatus = "ACTIVE" | "INACTIVE" | "TERMINATED";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PayrollStatus = "PENDING" | "PAID";
export type ClientType = "INDIVIDUAL" | "CORPORATE" | "INSURANCE";
export type DocType = "QUOTATION" | "PROFORMA" | "INVOICE" | "TAX_INVOICE";
export type InvoicePaymentStatus =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";
export type PaymentMethod =
  | "CASH"
  | "MPESA"
  | "AIRTEL_MONEY"
  | "MIXX_BY_YAS"
  | "BANK_TRANSFER";
export type ExpenseCategory =
  | "MISHAHARA"
  | "VIFAA"
  | "USAFIRI"
  | "UENDESHAJI"
  | "MENGINEYO";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface StaffRow {
  id: string;
  user_id: string;
  staff_number: string;
  photo_url: string | null;
  profession: Profession;
  license_number: string | null;
  license_expiry_date: string | null;
  start_date: string;
  employment_status: EmploymentStatus;
  base_salary: string; // NUMERIC -> string
  allowances: string;
  leave_balance_days: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestRow {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  decided_by_id: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export interface PayrollRow {
  id: string;
  staff_id: string;
  month: number;
  year: number;
  base_salary: string;
  allowances: string;
  nssf_deduction: string;
  paye_deduction: string;
  other_deductions: string;
  gross_pay: string;
  net_pay: string;
  status: PayrollStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  type: ClientType;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceRow {
  id: string;
  document_number: string;
  doc_type: DocType;
  client_id: string;
  issue_date: string;
  due_date: string | null;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  amount_paid: string;
  payment_status: InvoicePaymentStatus;
  notes: string | null;
  converted_from_id: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItemRow {
  id: string;
  invoice_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  total: string;
}

export interface PaymentRow {
  id: string;
  invoice_id: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  received_by_id: string;
  paid_at: string;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  category: ExpenseCategory;
  amount: string;
  date: string;
  description: string;
  created_by_id: string;
  created_at: string;
}

export type BillStatus = "PENDING" | "PAID" | "OVERDUE";

export interface CompanyBillRow {
  id: string;
  name: string;
  category: string;
  amount: string;
  due_date: string;
  status: BillStatus;
  paid_at: string | null;
  notes: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export type StockMovementType = "IN" | "OUT";

export interface InventoryItemRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovementRow {
  id: string;
  item_id: string;
  movement_type: StockMovementType;
  quantity: number;
  batch_number: string | null;
  expiry_date: string | null;
  reference: string | null;
  notes: string | null;
  created_by_id: string;
  created_at: string;
}

export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface PatientRow {
  id: string;
  patient_number: string | null;
  photo_url: string | null;
  full_name: string;
  date_of_birth: string | null;
  gender: Gender | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  blood_type: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  notes: string | null;
  assigned_staff_id: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface PatientMedicationRow {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface PatientDocumentRow {
  id: string;
  patient_id: string;
  title: string;
  document_type: string;
  notes: string | null;
  uploaded_by_id: string;
  created_at: string;
}

export type HomeVisitStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export type DutyStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export interface StaffDutyRow {
  id: string;
  staff_id: string;
  title: string;
  description: string | null;
  status: DutyStatus;
  due_date: string | null;
  assigned_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface HomeVisitRow {
  id: string;
  patient_id: string;
  staff_id: string | null;
  visit_date: string;
  status: HomeVisitStatus;
  location: string | null;
  blood_pressure: string | null;
  temperature: string | null;
  pulse: number | null;
  weight: string | null;
  height_cm: string | null;
  blood_glucose: string | null;
  food_intake: string | null;
  treatment_notes: string | null;
  notes: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  amount: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export type MarketingPlatform =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "WHATSAPP"
  | "TIKTOK"
  | "X"
  | "OTHER";

export interface MarketingPostRow {
  id: string;
  title: string;
  content: string;
  platform: MarketingPlatform;
  ai_generated: boolean;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
}
