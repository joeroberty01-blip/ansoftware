import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// CR80 card size (85.6mm x 54mm) in points.
const CARD_WIDTH = 242.65;
const CARD_HEIGHT = 153.07;

const NAVY = "#0D2A5C";
const ORANGE = "#F58220";
const GRAY = "#6B7280";
const CREAM = "#FBF7F2";

const styles = StyleSheet.create({
  frontPage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    flexDirection: "row",
    backgroundColor: CREAM,
  },
  stripe: { width: 10, backgroundColor: ORANGE },
  frontBody: { flex: 1, padding: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  logoBox: {
    width: 26,
    height: 26,
    borderRadius: 5,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  logoText: { color: "#ffffff", fontSize: 10, fontWeight: 700 },
  companyName: { fontSize: 11, fontWeight: 700, color: NAVY },
  companySub: { fontSize: 6.5, color: GRAY, marginTop: 1 },
  divider: { borderBottom: 1, borderBottomColor: "#D9D2C7", marginBottom: 8 },
  infoRow: { flexDirection: "row", alignItems: "flex-start" },
  photoBox: {
    width: 62,
    height: 62,
    borderRadius: 4,
    backgroundColor: NAVY,
    marginRight: 10,
    overflow: "hidden",
  },
  photoImg: { width: 62, height: 62, objectFit: "cover" },
  nameText: { fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 4 },
  rolePill: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingVertical: 2.5,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
    marginBottom: 5,
  },
  rolePillText: { color: "#ffffff", fontSize: 7.5, fontWeight: 700 },
  idNoLabel: { fontSize: 7.5, color: "#1a1a1a" },
  idNoValue: { fontSize: 7.5, color: GRAY },
  frontFooterRow: {
    position: "absolute",
    bottom: 8,
    left: 20,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  frontFooterText: { fontSize: 6, color: GRAY },

  backPage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: NAVY,
    padding: 12,
  },
  backHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  backCompanyName: { fontSize: 9.5, fontWeight: 700, color: "#ffffff", lineHeight: 1.3 },
  backRow: { flexDirection: "row", marginBottom: 4 },
  backLabel: { fontSize: 6.5, fontWeight: 700, color: ORANGE, width: 60 },
  backValue: { fontSize: 6.5, color: "#ffffff", flex: 1 },
  qrBox: {
    position: "absolute",
    top: 40,
    right: 12,
    width: 54,
    height: 54,
    backgroundColor: "#ffffff",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  qrImg: { width: 46, height: 46 },
  qrCaption: {
    position: "absolute",
    top: 96,
    right: 6,
    width: 66,
    fontSize: 5,
    color: "#cbd5e1",
    textAlign: "center",
  },
  disclaimer: {
    position: "absolute",
    bottom: 8,
    left: 12,
    right: 12,
    fontSize: 5.2,
    color: "#93a3c2",
    lineHeight: 1.4,
  },
});

const PROFESSION_LABELS: Record<string, string> = {
  NURSE: "REGISTERED NURSE",
  DOCTOR: "DOCTOR",
  CHW: "COMMUNITY HEALTH WORKER",
  ADMIN_STAFF: "ADMIN STAFF",
};

interface StaffIdCardData {
  full_name: string;
  profession: string;
  staff_number: string;
  phone: string | null;
  email: string;
}

export function StaffIdCardDocument({
  staff,
  photoDataUri,
  qrDataUri,
}: {
  staff: StaffIdCardData;
  photoDataUri: string | null;
  qrDataUri: string;
}) {
  const idSuffix = staff.staff_number.split("-").pop() ?? staff.staff_number;
  const roleLabel = PROFESSION_LABELS[staff.profession] ?? staff.profession;

  return (
    <Document>
      <Page size={[CARD_WIDTH, CARD_HEIGHT]} style={styles.frontPage}>
        <View style={styles.stripe} />
        <View style={styles.frontBody}>
          <View style={styles.headerRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>AN</Text>
            </View>
            <View>
              <Text style={styles.companyName}>AFYA NYUMBANI</Text>
              <Text style={styles.companySub}>HOME CARE SERVICE LTD</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.photoBox}>
              {photoDataUri && (
                <Image src={photoDataUri} style={styles.photoImg} />
              )}
            </View>
            <View>
              <Text style={styles.nameText}>{staff.full_name}</Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{roleLabel}</Text>
              </View>
              <Text>
                <Text style={styles.idNoLabel}>ID No: </Text>
                <Text style={styles.idNoValue}>{staff.staff_number}</Text>
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.frontFooterRow}>
          <Text style={styles.frontFooterText}>Dar es Salaam, Tanzania</Text>
          <Text style={styles.frontFooterText}>ID: {idSuffix}</Text>
        </View>
      </Page>

      <Page size={[CARD_WIDTH, CARD_HEIGHT]} style={styles.backPage}>
        <View style={styles.backHeaderRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>AN</Text>
          </View>
          <Text style={styles.backCompanyName}>
            AFYA NYUMBANI HOME{"\n"}CARE SERVICE LTD
          </Text>
        </View>

        <View style={styles.backRow}>
          <Text style={styles.backLabel}>Simu:</Text>
          <Text style={styles.backValue}>{staff.phone ?? "-"}</Text>
        </View>
        <View style={styles.backRow}>
          <Text style={styles.backLabel}>Barua pepe:</Text>
          <Text style={styles.backValue}>{staff.email}</Text>
        </View>
        <View style={styles.backRow}>
          <Text style={styles.backLabel}>Mahali:</Text>
          <Text style={styles.backValue}>Dar es Salaam, Tanzania</Text>
        </View>
        <View style={styles.backRow}>
          <Text style={styles.backLabel}>Tovuti:</Text>
          <Text style={styles.backValue}>afyanyumbani.com</Text>
        </View>

        <View style={styles.qrBox}>
          <Image src={qrDataUri} style={styles.qrImg} />
        </View>
        <Text style={styles.qrCaption}>Tembelea tovuti yetu</Text>

        <Text style={styles.disclaimer}>
          Kadi hii ni mali ya Afya Nyumbani Home Care Service Ltd. Ikiwa
          itaokotwa, tafadhali rejesha kwa namba ya simu iliyoainishwa hapo
          juu.
        </Text>
      </Page>
    </Document>
  );
}
