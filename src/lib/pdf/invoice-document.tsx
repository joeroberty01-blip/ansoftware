import path from "node:path";
import Decimal from "decimal.js";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoiceDetail } from "@/lib/repo/invoices";
import {
  BRAND,
  STATUS_COLORS,
  STATUS_LABELS,
  formatInvoiceDate,
} from "@/lib/invoice-brand";

const LOGO_PATH = path.join(process.cwd(), "public", "logo-afyanyumbani.png");

const styles = StyleSheet.create({
  page: { fontSize: 9.5, fontFamily: "Helvetica", color: "#1a1a1a" },

  header: {
    backgroundColor: BRAND.navy,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  logo: { width: 46, height: 46, borderRadius: 6, marginRight: 12 },
  companyName: { fontSize: 18, fontWeight: 700, color: "#ffffff" },
  companyTagline: { fontSize: 7.5, color: "#B9C4DE", marginTop: 2, letterSpacing: 0.5 },
  companyMeta: { fontSize: 7.5, color: "#B9C4DE", marginTop: 3 },
  headerRight: { alignItems: "flex-end" },
  docTypePill: {
    backgroundColor: BRAND.orange,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  docTypePillText: { fontSize: 7.5, fontWeight: 700, color: "#ffffff" },
  docNumber: { fontSize: 15, fontWeight: 700, color: "#ffffff" },
  docDate: { fontSize: 7.5, color: "#B9C4DE", marginTop: 2 },
  accentBar: { height: 4, backgroundColor: BRAND.orange },

  body: { padding: 32 },

  metaRow: { flexDirection: "row", marginBottom: 20 },
  metaCol: { flex: 1 },
  metaLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: BRAND.gray,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: { fontSize: 10.5, fontWeight: 700 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },
  statusText: { fontSize: 9, fontWeight: 700 },

  table: { marginBottom: 20 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#E5E1D8",
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: 700,
    color: BRAND.gray,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#F1EEE6",
    paddingVertical: 7,
  },
  colIndex: { width: 20 },
  colDesc: { flex: 3, fontWeight: 700 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.4, textAlign: "right" },
  colTotal: { flex: 1.4, textAlign: "right", fontWeight: 700, color: BRAND.orange },

  boxRow: { flexDirection: "row", marginBottom: 16 },
  box: {
    flex: 1,
    backgroundColor: BRAND.cream,
    borderRadius: 8,
    padding: 14,
  },
  boxSpacer: { width: 14 },
  boxLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: BRAND.gray,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paymentRow: { flexDirection: "row", alignItems: "center" },
  paymentIcon: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: BRAND.orange,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  paymentIconText: { fontSize: 9, fontWeight: 700, color: "#ffffff" },
  paymentSmall: { fontSize: 6.5, color: BRAND.gray },
  paymentNumber: { fontSize: 12, fontWeight: 700, marginTop: 1 },
  paymentAccount: { fontSize: 7.5, fontWeight: 700, marginTop: 1 },
  paymentNote: { fontSize: 6.5, color: BRAND.gray, marginTop: 8, lineHeight: 1.4 },

  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalsLabel: { fontSize: 8.5, color: BRAND.gray },
  totalsValue: { fontSize: 8.5, fontWeight: 700 },
  totalsDivider: {
    borderTop: 1,
    borderTopColor: "#E5E1D8",
    marginVertical: 6,
  },
  grandLabel: { fontSize: 10.5, fontWeight: 700 },
  grandValue: { fontSize: 12, fontWeight: 700, color: BRAND.orange },

  notesBox: {
    backgroundColor: BRAND.cream,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  notesLabel: { fontSize: 8, fontWeight: 700, color: BRAND.orange, marginBottom: 2 },
  notesText: { fontSize: 8, color: "#333333" },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 10,
    paddingTop: 16,
    borderTop: 1,
    borderTopColor: "#E5E1D8",
  },
  qrImg: { width: 56, height: 56 },
  qrCaption: { fontSize: 6, color: BRAND.gray, marginTop: 4, width: 110, lineHeight: 1.4 },
  footerRight: { alignItems: "flex-end" },
  footerCompany: { fontSize: 8, fontWeight: 700 },
  footerLine: { fontSize: 6.5, color: BRAND.gray, marginTop: 1 },
});

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

const DOC_TITLES: Record<InvoiceDetail["doc_type"], string> = {
  QUOTATION: "QUOTATION",
  PROFORMA: "PROFORMA INVOICE",
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
  const hasTax = Number(invoice.tax_amount) > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={LOGO_PATH} style={styles.logo} />
            <View>
              <Text style={styles.companyName}>{BRAND.name}</Text>
              <Text style={styles.companyTagline}>{BRAND.tagline}</Text>
              <Text style={styles.companyMeta}>
                {BRAND.website}   {BRAND.social}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.docTypePill}>
              <Text style={styles.docTypePillText}>{DOC_TITLES[invoice.doc_type]}</Text>
            </View>
            <Text style={styles.docNumber}>{invoice.document_number}</Text>
            <Text style={styles.docDate}>{formatInvoiceDate(invoice.issue_date)}</Text>
          </View>
        </View>
        <View style={styles.accentBar} />

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>BILLED TO</Text>
              <Text style={styles.metaValue}>{invoice.client_name}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DUE DATE</Text>
              <Text style={styles.metaValue}>
                {invoice.due_date ? formatInvoiceDate(invoice.due_date) : "On Receipt"}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>STATUS</Text>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, styles.colIndex]}>#</Text>
              <Text style={[styles.tableHeaderText, styles.colDesc]}>DESCRIPTION</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>QTY</Text>
              <Text style={[styles.tableHeaderText, styles.colPrice]}>UNIT PRICE</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>TOTAL</Text>
            </View>
            {invoice.items.map((item, i) => (
              <View style={styles.tableRow} key={item.id}>
                <Text style={styles.colIndex}>{i + 1}</Text>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>TZS {fmt(item.unit_price)}</Text>
                <Text style={styles.colTotal}>TZS {fmt(item.total)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.boxRow}>
            {isPayable && (
              <>
                <View style={styles.box}>
                  <Text style={styles.boxLabel}>PAYMENT METHOD</Text>
                  <View style={styles.paymentRow}>
                    <View style={styles.paymentIcon}>
                      <Text style={styles.paymentIconText}>T</Text>
                    </View>
                    <View>
                      <Text style={styles.paymentSmall}>TIGO PESA LIPA NAMBA</Text>
                      <Text style={styles.paymentNumber}>{BRAND.tigoPesaNumber}</Text>
                      <Text style={styles.paymentAccount}>
                        {BRAND.tigoPesaAccountName}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.paymentNote}>
                    Send exact amount and use invoice number as reference.
                    {"\n"}WhatsApp confirmation: {BRAND.whatsapp}
                  </Text>
                </View>
                <View style={styles.boxSpacer} />
              </>
            )}
            <View style={styles.box}>
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
              <View style={styles.totalsDivider} />
              <View style={styles.totalsRow}>
                <Text style={styles.grandLabel}>TOTAL DUE</Text>
                <Text style={styles.grandValue}>TZS {fmt(invoice.total_amount)}</Text>
              </View>
              {isPayable && Number(invoice.amount_paid) > 0 && (
                <>
                  <View style={styles.totalsDivider} />
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Imelipwa</Text>
                    <Text style={styles.totalsValue}>TZS {fmt(invoice.amount_paid)}</Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Salio</Text>
                    <Text style={styles.totalsValue}>TZS {fmt(balance)}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {invoice.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{invoice.notes}</Text>
            </View>
          )}

          <View style={styles.footer}>
            <View>
              {qrDataUri && <Image src={qrDataUri} style={styles.qrImg} />}
              <Text style={styles.qrCaption}>
                Scan to Verify — this QR contains invoice details, amount &
                Tigo Pesa payment reference.
              </Text>
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.footerCompany}>{BRAND.name}</Text>
              <Text style={styles.footerLine}>{BRAND.address}</Text>
              <Text style={styles.footerLine}>Tigo Pesa: {BRAND.tigoPesaNumber}</Text>
              <Text style={styles.footerLine}>WhatsApp: {BRAND.whatsapp}</Text>
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
