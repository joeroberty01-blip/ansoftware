import Decimal from "decimal.js";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PaymentWithContext } from "@/lib/repo/invoices";

// 80mm thermal receipt paper width (≈226.77pt). Height is generous and
// fixed since @react-pdf/renderer pages need an explicit size — receipt
// content is always short and never overflows it.
const RECEIPT_WIDTH = 226.77;
const RECEIPT_HEIGHT = 420;

const styles = StyleSheet.create({
  page: {
    width: RECEIPT_WIDTH,
    height: RECEIPT_HEIGHT,
    padding: 12,
    fontSize: 8,
    fontFamily: "Helvetica",
  },
  center: { textAlign: "center" },
  companyName: { fontSize: 10, fontWeight: 700, textAlign: "center" },
  sub: { fontSize: 7, color: "#555555", textAlign: "center", marginTop: 1 },
  divider: {
    borderBottom: 1,
    borderBottomColor: "#000000",
    borderBottomStyle: "dashed",
    marginVertical: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#333333" },
  bold: { fontWeight: 700 },
  bigAmount: { fontSize: 13, fontWeight: 700, textAlign: "center", marginVertical: 6 },
  footer: { marginTop: 10, fontSize: 7, textAlign: "center", color: "#555555" },
});

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function ReceiptDocument({ payment }: { payment: PaymentWithContext }) {
  const balance = new Decimal(payment.total_amount)
    .minus(payment.amount_paid)
    .toFixed(2);
  const paidAt = new Date(payment.paid_at);

  return (
    <Document>
      <Page size={[RECEIPT_WIDTH, RECEIPT_HEIGHT]} style={styles.page}>
        <Text style={styles.companyName}>Afya Nyumbani Home Care</Text>
        <Text style={styles.sub}>Dar es Salaam, Tanzania</Text>
        <Text style={styles.sub}>RISITI YA MALIPO</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Hati</Text>
          <Text>{payment.document_number}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Client</Text>
          <Text>{payment.client_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tarehe</Text>
          <Text>{paidAt.toISOString().slice(0, 16).replace("T", " ")}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Njia</Text>
          <Text>{payment.method}</Text>
        </View>
        {payment.reference && (
          <View style={styles.row}>
            <Text style={styles.label}>Kumbukumbu</Text>
            <Text>{payment.reference}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Aliyepokea</Text>
          <Text>{payment.received_by_name}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={[styles.center, styles.label]}>Kiasi Kilicholipwa</Text>
        <Text style={styles.bigAmount}>TZS {fmt(payment.amount)}</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Jumla ya Hati</Text>
          <Text>{fmt(payment.total_amount)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Imelipwa Yote</Text>
          <Text>{fmt(payment.amount_paid)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, styles.bold]}>Salio</Text>
          <Text style={styles.bold}>{fmt(balance)}</Text>
        </View>

        <Text style={styles.footer}>Asante kwa kutumia huduma zetu</Text>
        <Text style={styles.footer}>Afya Nyumbani ERP</Text>
      </Page>
    </Document>
  );
}
