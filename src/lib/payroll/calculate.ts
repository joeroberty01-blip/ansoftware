import Decimal from "decimal.js";

export interface PayrollCalculationInput {
  baseSalary: string;
  allowances: string;
  otherDeductions: string;
  applyNssf?: boolean;
}

export interface PayrollCalculationResult {
  grossPay: string;
  nssfDeduction: string;
  payeDeduction: string;
  otherDeductions: string;
  netPay: string;
}

const NSSF_RATE = new Decimal("0.10");

// Makadirio ya PAYE bands za Tanzania (TRA, kwa mwezi, TZS). Hii ni
// makadirio ya maendeleo/majaribio TU — si ushauri rasmi wa kodi, na
// bands halisi hubadilika kwa sheria ya fedha kila mwaka.
const PAYE_BANDS: { threshold: Decimal; base: Decimal; rate: Decimal }[] = [
  { threshold: new Decimal(0), base: new Decimal(0), rate: new Decimal(0) },
  { threshold: new Decimal(270000), base: new Decimal(0), rate: new Decimal("0.08") },
  { threshold: new Decimal(520000), base: new Decimal(20000), rate: new Decimal("0.20") },
  { threshold: new Decimal(760000), base: new Decimal(68000), rate: new Decimal("0.25") },
  { threshold: new Decimal(1000000), base: new Decimal(128000), rate: new Decimal("0.30") },
];

function calculatePaye(taxableIncome: Decimal): Decimal {
  let band = PAYE_BANDS[0];
  for (const b of PAYE_BANDS) {
    if (taxableIncome.greaterThanOrEqualTo(b.threshold)) {
      band = b;
    } else {
      break;
    }
  }
  const excess = taxableIncome.minus(band.threshold);
  return band.base.plus(excess.times(band.rate));
}

/**
 * Pure, unit-testable payroll calculation. Every value flows through
 * Decimal.js — no native JS number arithmetic touches money at any point.
 */
export function calculatePayroll(
  input: PayrollCalculationInput
): PayrollCalculationResult {
  const baseSalary = new Decimal(input.baseSalary);
  const allowances = new Decimal(input.allowances);
  const otherDeductions = new Decimal(input.otherDeductions);

  const grossPay = baseSalary.plus(allowances);
  const nssfDeduction =
    input.applyNssf === false
      ? new Decimal(0)
      : grossPay.times(NSSF_RATE).toDecimalPlaces(2);
  const payeDeduction = calculatePaye(grossPay).toDecimalPlaces(2);
  const netPay = grossPay
    .minus(nssfDeduction)
    .minus(payeDeduction)
    .minus(otherDeductions)
    .toDecimalPlaces(2);

  return {
    grossPay: grossPay.toFixed(2),
    nssfDeduction: nssfDeduction.toFixed(2),
    payeDeduction: payeDeduction.toFixed(2),
    otherDeductions: otherDeductions.toFixed(2),
    netPay: netPay.toFixed(2),
  };
}
