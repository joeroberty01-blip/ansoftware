import { readFileSync } from "node:fs";
import path from "node:path";
import Decimal from "decimal.js";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoiceDetail } from "@/lib/repo/invoices";
import {
  BRAND,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_TINTS,
  formatInvoiceDate,
} from "@/lib/invoice-brand";

const LOGO_PATH = path.join(process.cwd(), "public", "logo-afyanyumbani-mark.png");

// Hand react-pdf the raw bytes: a bare file path silently fails to load in
// some runtimes, which left the logo slot blank.
let logoData: Buffer | null = null;
function logoSource() {
  if (!logoData) logoData = readFileSync(LOGO_PATH);
  return { data: logoData, format: "png" as const };
}

const INK = "#1a1a1a";
const MUTED = "#6B7280";

const styles = StyleSheet.create({
  page: { fontSize: 9.5, fontFamily: "Helvetica", color: INK, paddingBottom: 40 },

  topBar: { flexDirection: "row", height: 7 },
  topBarBlue: { flex: 1, backgroundColor: BRAND.blue },
  topBarOrange: { width: 90, backgroundColor: BRAND.orange },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 6,
  },
  brand: { flexDirection: "row", alignItems: "center" },
  logo: { width: 52, height: 52, objectFit: "contain", marginRight: 12 },
  companyName: { fontSize: 17, fontWeight: 700, color: BRAND.blue },
  companyTagline: { fontSize: 7, color: MUTED, marginTop: 2, letterSpacing: 0.8 },
  companyMeta: { fontSize: 7.5, color: MUTED, marginTop: 3 },
  titleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 24, fontWeight: 700, color: BRAND.blue, letterSpacing: 1.5 },
  docNumber: { fontSize: 10.5, fontWeight: 700, color: INK, marginTop: 3 },

  body: { paddingHorizontal: 40, paddingTop: 14 },

  metaCard: {
    flexDirection: "row",
    backgroundColor: BRAND.light,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 6.5, fontWeight: 700, color: MUTED, letterSpacing: 0.8, marginBottom: 4 },
  metaValue: { fontSize: 10, fontWeight: 700 },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 2.5,
    paddingHorizontal: 8,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },
  statusText: { fontSize: 7.5, fontWeight: 700, letterSpacing: 0.4 },

  billed: { marginBottom: 18 },
  billedName: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  billedLine: { fontSize: 8.5, color: MUTED, marginTop: 1 },

  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: BRAND.blue,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableHeaderText: { fontSize: 7, fontWeight: 700, color: "#ffffff", letterSpacing: 0.8 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottom: 1,
    borderBottomColor: BRAND.line,
  },
  tableRowAlt: { backgroundColor: "#FBF7F2" },
  colIndex: { width: 22, color: MUTED },
  colDesc: { flex: 3.2, fontWeight: 700 },
  colQty: { flex: 0.9, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right", fontWeight: 700 },

  lower: { flexDirection: "row", marginTop: 18, alignItems: "flex-start" },
  lowerLeft: { flex: 1, paddingRight: 20 },
  lowerRight: { width: 220 },

  payCard: {
    borderLeft: 3,
    borderLeftColor: BRAND.orange,
    backgroundColor: "#FBF7F2",
    borderRadius: 6,
    padding: 12,
  },
  payLabel: { fontSize: 6.5, fontWeight: 700, color: MUTED, letterSpacing: 0.8, marginBottom: 6 },
  payRow: { flexDirection: "row", alignItems: "center" },
  payIcon: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: BRAND.orange,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  payIconText: { fontSize: 9, fontWeight: 700, color: "#ffffff" },
  paySmall: { fontSize: 6.5, color: MUTED },
  payNumber: { fontSize: 13, fontWeight: 700, marginTop: 1 },
  payAccount: { fontSize: 7.5, fontWeight: 700, marginTop: 1 },
  payNote: { fontSize: 7, color: MUTED, marginTop: 8, lineHeight: 1.5 },

  notes: { marginTop: 12 },
  notesLabel: { fontSize: 6.5, fontWeight: 700, color: MUTED, letterSpacing: 0.8, marginBottom: 3 },
  notesText: { fontSize: 8.5, color: "#334155", lineHeight: 1.5 },

  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3.5 },
  totalsLabel: { fontSize: 9, color: MUTED },
  totalsValue: { fontSize: 9, fontWeight: 700 },
  grandBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BRAND.blue,
    borderRadius: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  grandLabel: { fontSize: 9, fontWeight: 700, color: "#ffffff", letterSpacing: 0.8 },
  grandValue: { fontSize: 13, fontWeight: 700, color: "#ffffff" },
  divider: { borderTop: 1, borderTopColor: BRAND.line, marginVertical: 5 },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 30,
    paddingTop: 14,
    borderTop: 1,
    borderTopColor: BRAND.line,
  },
  qrImg: { width: 54, height: 54 },
  qrCaption: { fontSize: 6, color: MUTED, marginTop: 4, width: 120, lineHeight: 1.4 },
  footerRight: { alignItems: "flex-end" },
  thanks: { fontSize: 10, fontWeight: 700, color: BRAND.blue, marginBottom: 3 },
  footerLine: { fontSize: 7, color: MUTED, marginTop: 1 },
});

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

const DOC_TITLES: Record<InvoiceDetail["doc_type"], string> = {
  QUOTATION: "QUOTATION",
  PROFORMA: "PROFORMA",
  INVOICE: "INVOICE",
  TAX_INVOICE: "TAX INVOICE",
};

const PAYABLE_TYPES: InvoiceDetail["doc_type"][] = ["INVOICE", "TAX_INVOICE"];

export function InvoiceDocument({
  invoice,
  qrDataUri,
}: {
  invoice: InvoiceDetail;
  qrDataUri: string | null;
}) {
  const isPayable = PAYABLE_TYPES.includes(invoice.doc_type);
  const balance = new Decimal(invoice.total_amount)
    .minus(invoice.amount_paid)
    .toFixed(2);
  const statusLabel = STATUS_LABELS[invoice.payment_status] ?? invoice.payment_status;
  const statusColor = STATUS_COLORS[invoice.payment_status] ?? BRAND.gray;
  const statusTint = STATUS_TINTS[invoice.payment_status] ?? "#EEF0F4";
  const hasTax = Number(invoice.tax_amount) > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar}>
          <View style={styles.topBarBlue} />
          <View style={styles.topBarOrange} />
        </View>

        <View style={styles.header}>
          <View style={styles.brand}>
            <Image src={logoSource()} style={styles.logo} />
            <View>
              <Text style={styles.companyName}>{BRAND.name}</Text>
              <Text style={styles.companyTagline}>{BRAND.tagline}</Text>
              <Text style={styles.companyMeta}>
                {BRAND.website}   {BRAND.social}
              </Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.docTitle}>{DOC_TITLES[invoice.doc_type]}</Text>
            <Text style={styles.docNumber}>{invoice.document_number}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.metaCard}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>ISSUE DATE</Text>
              <Text style={styles.metaValue}>{formatInvoiceDate(invoice.issue_date)}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DUE DATE</Text>
              <Text style={styles.metaValue}>
                {invoice.due_date ? formatInvoiceDate(invoice.due_date) : "On Receipt"}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>STATUS</Text>
              <View style={[styles.statusPill, { backgroundColor: statusTint }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.billed}>
            <Text style={styles.metaLabel}>BILLED TO</Text>
            <Text style={styles.billedName}>{invoice.client_name}</Text>
            {invoice.client_phone ? (
              <Text style={styles.billedLine}>{invoice.client_phone}</Text>
            ) : null}
            {invoice.client_email ? (
              <Text style={styles.billedLine}>{invoice.client_email}</Text>
            ) : null}
          </View>

          <View>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, styles.colIndex, { color: "#ffffff" }]}>#</Text>
              <Text style={[styles.tableHeaderText, styles.colDesc, { color: "#ffffff" }]}>DESCRIPTION</Text>
              <Text style={[styles.tableHeaderText, styles.colQty, { color: "#ffffff" }]}>QTY</Text>
              <Text style={[styles.tableHeaderText, styles.colPrice, { color: "#ffffff" }]}>UNIT PRICE</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal, { color: "#ffffff" }]}>TOTAL</Text>
            </View>
            {invoice.items.map((item, i) => (
              <View
                style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
                key={item.id}
                wrap={false}
              >
                <Text style={styles.colIndex}>{i + 1}</Text>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>TZS {fmt(item.unit_price)}</Text>
                <Text style={styles.colTotal}>TZS {fmt(item.total)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.lower} wrap={false}>
            <View style={styles.lowerLeft}>
              {isPayable && (
                <View style={styles.payCard}>
                  <Text style={styles.payLabel}>PAYMENT METHOD</Text>
                  <View style={styles.payRow}>
                    <View style={styles.payIcon}>
                      <Text style={styles.payIconText}>T</Text>
                    </View>
                    <View>
                      <Text style={styles.paySmall}>TIGO PESA LIPA NAMBA</Text>
                      <Text style={styles.payNumber}>{BRAND.tigoPesaNumber}</Text>
                      <Text style={styles.payAccount}>{BRAND.tigoPesaAccountName}</Text>
                    </View>
                  </View>
                  <Text style={styles.payNote}>
                    Send exact amount and use the invoice number as reference.
                    {"\n"}WhatsApp confirmation: {BRAND.whatsapp}
                  </Text>
                </View>
              )}
              {invoice.notes && (
                <View style={styles.notes}>
                  <Text style={styles.notesLabel}>NOTES</Text>
                  <Text style={styles.notesText}>{invoice.notes}</Text>
                </View>
              )}
            </View>

            <View style={styles.lowerRight}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Subtotal</Text>
                <Text style={styles.totalsValue}>TZS {fmt(invoice.subtotal)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>VAT</Text>
                <Text style={styles.totalsValue}>
                  {hasTax ? `TZS ${fmt(invoice.tax_amount)}` : "N/A"}
                </Text>
              </View>
              <View style={styles.grandBar}>
                <Text style={styles.grandLabel}>TOTAL DUE</Text>
                <Text style={styles.grandValue}>TZS {fmt(invoice.total_amount)}</Text>
              </View>
              {isPayable && Number(invoice.amount_paid) > 0 && (
                <View style={{ marginTop: 6 }}>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Imelipwa</Text>
                    <Text style={styles.totalsValue}>TZS {fmt(invoice.amount_paid)}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.totalsRow}>
                    <Text style={[styles.totalsLabel, { color: INK, fontWeight: 700 }]}>Salio</Text>
                    <Text style={styles.totalsValue}>TZS {fmt(balance)}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.footer} wrap={false}>
            <View>
              {qrDataUri && <Image src={qrDataUri} style={styles.qrImg} />}
              <Text style={styles.qrCaption}>
                Scan to verify: invoice details, amount and Tigo Pesa reference.
              </Text>
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.thanks}>Thank you for choosing {BRAND.name}</Text>
              <Text style={styles.footerLine}>{BRAND.address}</Text>
              <Text style={styles.footerLine}>Tigo Pesa: {BRAND.tigoPesaNumber}   WhatsApp: {BRAND.whatsapp}</Text>
              <Text style={styles.footerLine}>
                Generated: {formatInvoiceDate(new Date().toISOString())}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
