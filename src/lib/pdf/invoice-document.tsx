import Decimal from "decimal.js";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoiceDetail } from "@/lib/repo/invoices";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: "#0D4EA6",
    paddingBottom: 12,
  },
  companyName: { fontSize: 16, fontWeight: 700, color: "#0D4EA6" },
  companySub: { fontSize: 9, color: "#555555", marginTop: 2 },
  docTitle: { fontSize: 14, fontWeight: 700, marginTop: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    width: 260,
  },
  section: { marginTop: 16 },
  label: { color: "#555555" },
  table: { marginTop: 8, borderTop: 1, borderTopColor: "#cccccc" },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#333333",
    paddingVertical: 6,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#eeeeee",
    paddingVertical: 6,
  },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  totalsBox: { marginTop: 12, alignItems: "flex-end" },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 220,
    marginBottom: 3,
  },
  grandTotal: { fontWeight: 700, fontSize: 12 },
  footer: { marginTop: 24, fontSize: 8, color: "#888888" },
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

export function InvoiceDocument({ invoice }: { invoice: InvoiceDetail }) {
  const isPayable = PAYABLE_TYPES.includes(invoice.doc_type);
  const balance = new Decimal(invoice.total_amount)
    .minus(invoice.amount_paid)
    .toFixed(2);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>
            Afya Nyumbani Home Care Services Ltd
          </Text>
          <Text style={styles.companySub}>Dar es Salaam, Tanzania</Text>
        </View>

        <Text style={styles.docTitle}>
          {DOC_TITLES[invoice.doc_type]} — {invoice.document_number}
        </Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Client</Text>
            <Text>{invoice.client_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Simu</Text>
            <Text>{invoice.client_phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tarehe</Text>
            <Text>{new Date(invoice.issue_date).toISOString().slice(0, 10)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text>{invoice.payment_status}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDesc}>Maelezo</Text>
            <Text style={styles.colQty}>Idadi</Text>
            <Text style={styles.colPrice}>Bei</Text>
            <Text style={styles.colTotal}>Jumla</Text>
          </View>
          {invoice.items.map((item) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{fmt(item.unit_price)}</Text>
              <Text style={styles.colTotal}>{fmt(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{fmt(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Kodi</Text>
            <Text>{fmt(invoice.tax_amount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.grandTotal}>JUMLA KUU</Text>
            <Text style={styles.grandTotal}>{fmt(invoice.total_amount)}</Text>
          </View>
          {isPayable && (
            <>
              <View style={styles.totalsRow}>
                <Text>Imelipwa</Text>
                <Text>{fmt(invoice.amount_paid)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text>Salio</Text>
                <Text>{fmt(balance)}</Text>
              </View>
            </>
          )}
        </View>

        <Text style={styles.footer}>
          Imetengenezwa na Afya Nyumbani ERP
        </Text>
      </Page>
    </Document>
  );
}
