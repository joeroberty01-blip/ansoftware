import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { BRAND } from "@/lib/invoice-brand";
import type { HomeVisitWithNames } from "@/lib/repo/home-visits";
import {
  DAILY_SESSIONS,
  DAILY_SESSION_LABELS,
  NO_SESSION_LABEL,
  groupDailyReports,
  sessionState,
} from "@/lib/daily-reports";

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 36, paddingHorizontal: 32, fontSize: 9.5, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", alignItems: "center", borderBottom: 2, borderBottomColor: BRAND.orange, paddingBottom: 8, marginBottom: 10 },
  company: { fontSize: 13, fontWeight: 700, color: BRAND.navy },
  title: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  sub: { fontSize: 8.5, color: BRAND.gray },
  patientBox: { backgroundColor: BRAND.cream, borderRadius: 6, padding: 9, marginBottom: 10 },
  patientName: { fontSize: 11, fontWeight: 700 },
  card: { border: 1, borderColor: "#E5E1D8", borderRadius: 6, padding: 9, marginBottom: 8 },
  cardAlert: { borderColor: "#F5A25D", backgroundColor: "#FFF8F1" },
  cardHead: { flexDirection: "row", justifyContent: "space-between", borderBottom: 1, borderBottomColor: "#EFEAE0", paddingBottom: 4, marginBottom: 5 },
  date: { fontSize: 10.5, fontWeight: 700 },
  session: { borderTop: 1, borderTopColor: "#F3EFE6", paddingTop: 4, marginTop: 4 },
  sessionFirst: { paddingTop: 0, marginTop: 0, borderTop: 0 },
  sessionHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  sessionName: { fontSize: 9, fontWeight: 700, color: BRAND.navy, textTransform: "uppercase" },
  vitals: { flexDirection: "row", flexWrap: "wrap", marginBottom: 2 },
  chip: { backgroundColor: "#F3F1EC", borderRadius: 4, paddingVertical: 2, paddingHorizontal: 5, marginRight: 4, marginBottom: 3, fontSize: 8.5 },
  chipWarn: { backgroundColor: "#FDE3C8", color: "#9A4A06" },
  label: { fontSize: 7.5, fontWeight: 700, color: BRAND.gray, marginTop: 3, textTransform: "uppercase" },
  text: { fontSize: 9.5, lineHeight: 1.4 },
  empty: { fontSize: 8.5, color: "#A8A29E" },
  footer: { position: "absolute", bottom: 16, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: BRAND.gray },
});

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmtDate(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

export interface VisitReportPatient {
  full_name: string;
  patient_number: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
}

function vitalChips(v: HomeVisitWithNames) {
  return [
    v.blood_pressure ? `BP ${v.blood_pressure} mmHg` : null,
    v.temperature ? `Temp ${v.temperature} °C` : null,
    v.pulse != null ? `Pulse ${v.pulse} bpm` : null,
    v.blood_glucose ? `Glucose ${v.blood_glucose} mmol/L` : null,
    v.spo2 != null ? `SpO2 ${v.spo2}%` : null,
    v.weight ? `Weight ${v.weight} kg` : null,
  ].filter(Boolean) as string[];
}

function Entry({ v, warn }: { v: HomeVisitWithNames; warn: boolean }) {
  const items = vitalChips(v);
  const blocks = [
    { label: "Food Intake", value: v.food_intake },
    { label: "Treatment / Procedures", value: v.treatment_notes },
    { label: "Patient Progress / Notes", value: v.notes },
  ].filter((b) => b.value);
  const meta = [
    v.staff_name,
    v.location,
    v.visit_type === "PART_TIME" ? "Part-time" : null,
    v.status === "SCHEDULED" ? "Scheduled only" : v.status === "CANCELLED" ? "Cancelled" : null,
  ].filter(Boolean);
  return (
    <View>
      {meta.length > 0 && <Text style={styles.sub}>{meta.join("  •  ")}</Text>}
      <View style={styles.vitals}>
        {items.length === 0 ? (
          <Text style={styles.empty}>No vitals recorded.</Text>
        ) : (
          items.map((t) => (
            <Text key={t} style={warn ? [styles.chip, styles.chipWarn] : styles.chip}>
              {t}
            </Text>
          ))
        )}
      </View>
      {blocks.map((b) => (
        <View key={b.label}>
          <Text style={styles.label}>{b.label}</Text>
          <Text style={styles.text}>{b.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Patient visit report: one card per day, holding morning, afternoon and evening. */
export function VisitReportDocument({
  patient,
  visits,
  rangeLabel,
  alertIds,
}: {
  patient: VisitReportPatient;
  visits: HomeVisitWithNames[];
  rangeLabel: string;
  alertIds: Set<string>;
}) {
  const days = groupDailyReports(visits);
  return (
    <Document title={`Visit Reports - ${patient.full_name}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.company}>{BRAND.name}</Text>
            <Text style={styles.sub}>Daily Reports • {rangeLabel}</Text>
          </View>
        </View>

        <View style={styles.patientBox}>
          <Text style={styles.patientName}>
            {patient.full_name}
            {patient.patient_number ? `  (${patient.patient_number})` : ""}
          </Text>
          <Text style={styles.sub}>
            {[patient.gender, patient.phone, patient.address].filter(Boolean).join("  •  ") || "-"}
          </Text>
          <Text style={styles.sub}>
            Allergies: {patient.allergies || "Not recorded"}   |   Chronic Conditions:{" "}
            {patient.chronic_conditions || "Not recorded"}
          </Text>
        </View>

        {days.length === 0 ? (
          <Text style={styles.sub}>No visit reports in this period.</Text>
        ) : (
          days.map((day) => {
            const dayWarn = day.visits.some((v) => alertIds.has(v.id));
            const filled = DAILY_SESSIONS.filter((s) => sessionState(day.sessions[s]) === "done").length;
            const slots = [
              ...DAILY_SESSIONS.map((s) => ({ key: s, label: DAILY_SESSION_LABELS[s], entries: day.sessions[s] })),
              ...(day.other.length > 0 ? [{ key: "other", label: NO_SESSION_LABEL, entries: day.other }] : []),
            ];
            const weekday = WEEKDAYS[new Date(`${day.date}T00:00:00Z`).getUTCDay()] ?? "";
            return (
              <View key={day.key} style={dayWarn ? [styles.card, styles.cardAlert] : styles.card}>
                <View style={styles.cardHead} minPresenceAhead={60}>
                  <Text style={styles.date}>
                    {weekday}, {day.date}
                  </Text>
                  <Text style={styles.sub}>Sessions zilizojazwa: {filled}/3</Text>
                </View>
                {slots.map((slot, i) => (
                  <View key={slot.key} style={i === 0 ? [styles.session, styles.sessionFirst] : styles.session}>
                    <View style={styles.sessionHead}>
                      <Text style={styles.sessionName}>{slot.label}</Text>
                    </View>
                    {slot.entries.length === 0 ? (
                      <Text style={styles.empty}>Not filled in.</Text>
                    ) : (
                      slot.entries.map((v) => <Entry key={v.id} v={v} warn={alertIds.has(v.id)} />)
                    )}
                  </View>
                ))}
              </View>
            );
          })
        )}

        <View style={styles.footer} fixed>
          <Text>Generated by Afya Nyumbani ERP, {fmtDate(new Date())}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
