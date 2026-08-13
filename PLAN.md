# Mkakati wa Ujenzi — Afya Nyumbani Healthcare ERP (kwa Claude Code)

Hati hii ni mwongozo wa hatua kwa hatua (step-by-step) wa kujenga mfumo mzima
kwa kutumia **Claude Code**, kuanzia pale tulipoishia. Weka faili hii ndani ya
mradi wako kama `PLAN.md` na uifuate hatua kwa hatua — usimwambie Claude Code
"jenga ERP nzima" mara moja.

---

## 0. MUHIMU KABLA HUJAANZA

### 0.1 Mahali pa mradi
Mradi tayari upo: `afya-nyumbani-erp/` (Next.js 16 + TypeScript + Tailwind).
Kama unaanza kwenye kompyuta yako mwenyewe (si sandbox ya awali), hakikisha:
- Node.js 20+ na PostgreSQL 16 vimewekwa
- `npm install` imefanyika kwenye folder ya mradi

### 0.2 Uamuzi muhimu wa kiufundi: USITUMIE Prisma CLI moja kwa moja
Katika ujenzi wa awali, Prisma CLI (`prisma generate`, `prisma migrate`)
ilishindwa kufanya kazi kwa sababu inahitaji kufikia `binaries.prisma.sh`
kupakua engine za Rust — jambo ambalo halikuwezekana kwenye sandbox
iliyotumika awali.

**Kama una mtandao wa kawaida (kompyuta yako binafsi), Prisma CLI itafanya
kazi vizuri kabisa** — unaweza kumwambia Claude Code atumie Prisma ORM halisi
badala ya raw SQL, ambayo itakuwa rahisi zaidi kudumisha muda mrefu.

**Ukiendelea kwenye mazingira yenye vikwazo vya mtandao (km sandbox nyingine
ya Claude Code isiyofikia binaries.prisma.sh)**, tumia mkakati uliotumika
awali: PostgreSQL + `pg` (node-postgres) moja kwa moja, na SQL ya raw
iliyoandikwa kwa mkono (`prisma/init.sql`), pamoja na tabaka la
repo-functions (`src/lib/repo/*.ts`) badala ya Prisma Client iliyotengenezwa
kiotomatiki.

👉 **Agizo la kwanza kwa Claude Code**: "Jaribu `npx prisma generate`. Ikishindwa
kwa sababu ya mtandao (403/Forbidden kwenda binaries.prisma.sh), tumia mkakati
wa raw SQL + pg badala yake, kama ilivyoainishwa Sehemu 0.2 ya PLAN.md."

### 0.3 Kanuni za msingi za kufanya kazi na Claude Code (weka kwenye CLAUDE.md)
Weka maelekezo haya kwenye faili `CLAUDE.md` (Claude Code inayasoma kiotomatiki):

```
1. Jenga PHASE MOJA kwa wakati mmoja. Usianze phase inayofuata mpaka
   nithibitishe iliyopita imefanya kazi.
2. Baada ya kila hatua/sehemu, THIBITISHA kwa vitendo (curl kwenye API,
   psql query kuonyesha data halisi, au screenshot) — si maneno tu
   "nimekamilisha".
3. Kila feature mpya LAZIMA ionekane kwenye Sidebar. Pages za baadaye
   ziwe na ukurasa "Coming Soon" ulio wazi, si link zilizovunjika.
4. Fedha zote (bei, malipo, mishahara) LAZIMA zitumie Decimal/NUMERIC
   (kamwe si float/number ya kawaida ya JS kwa hesabu za pesa).
5. Operesheni zote za fedha ziwe ndani ya database transaction
   (withTransaction helper au Prisma $transaction).
6. USIONGEZE features ambazo hazijaombwa kwenye phase ya sasa.
7. Kabla ya kudai kazi imekamilika, endesha jaribio halisi
   (add/edit/delete/calculate) na unithibitishie matokeo.
```

---

## HATUA 1 — Thibitisha msingi uliopo (dakika 10-15)

Kabla ya kuongeza kitu chochote kipya, mwambie Claude Code:

1. Soma `prisma/init.sql`, `src/lib/db.ts`, `src/lib/auth.ts`,
   `src/lib/repo/users.ts`, `src/lib/repo/staff.ts`, na API routes
   zilizopo kwenye `src/app/api/auth/`.
2. Hakikisha database `afya_nyumbani_erp` ipo na jedwali 10 yapo
   (`psql -d afya_nyumbani_erp -c '\dt'`).
3. Endesha `npm run dev` na uthibitishe app inaanza bila error kwenye
   `http://localhost:3000`.
4. Jaribu `/api/auth/register` na `/api/auth/login` kwa `curl` moja kwa
   moja (mfano hapa chini) ili kuthibitisha auth layer inafanya kazi
   KABLA ya kujenga UI yoyote.

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"accountType":"ADMIN","fullName":"Admin Mkuu","email":"admin@afyanyumbani.com","phone":"0700000000","password":"password123","adminSecretCode":"AFYA-ADMIN-2026"}'
```

**Usiendelee mpaka hatua hii ikamilike na ithibitishwe.**

---

## HATUA 2 — Kumaliza Auth (RBAC + Staff Approval Flow)

Bado zinakosekana kutoka Phase 1 ya auth:

1. **Middleware ya RBAC** (`src/middleware.ts`):
   - Route zote za `/dashboard/*`, `/finance/*`, `/billing/*`, `/staff/*`
     zihitaji session kuwepo.
   - Route za Admin-only (Finance, Reports, Staff/Payroll) zikatae Staff
     wasiozidi wa ADMIN role — server-side, si UI check tu.
   - Redirect kwenda `/login` kama hakuna session.
2. **API ya kuidhinisha Staff** (`/api/staff/approvals`):
   - `GET` — orodha ya Staff wenye status PENDING (Admin only)
   - `POST /api/staff/approvals/[id]` — Admin anaidhinisha (APPROVED) au
     anakataa (REJECTED)
3. **Thibitisho**: Sajili Staff mpya, jaribu login (lazima ikatae kwa
   ujumbe "inasubiri idhini"), kisha Admin aidhinishe kupitia curl/API,
   kisha Staff ajaribu login tena (lazima ifanikiwe).

---

## HATUA 3 — Pages za Msingi + Sidebar Layout

1. `src/app/(auth)/login/page.tsx` — fomu ya login (Admin & Staff wote
   wanaingia sehemu moja)
2. `src/app/(auth)/register/page.tsx` — fomu yenye tabs mbili: "Admin"
   (inahitaji secret code) na "Staff" (inasubiri idhini)
3. `src/app/(dashboard)/layout.tsx` — Sidebar yenye ORODHA NZIMA:
   Dashboard, Finance/Accounting, Billing/Invoices, Staff, Bookings,
   Patients, Home Visits, Inventory, Reports, Documents, Settings.
   - Links za Phase 1 (Dashboard, Finance, Billing, Staff) ziende
     kwenye pages halisi.
   - Links za Phase 2-9 ziende kwenye `/coming-soon?feature=Bookings`
     n.k. (ukurasa mmoja wa jumla, si 404).
   - Onyesha jina la mtumiaji aliyeingia + role + logout button.
4. RBAC ya UI: Staff asione links za Finance/Billing/Reports kabisa
   kwenye sidebar yake (japo hii ni convenience tu — ulinzi wa kweli
   uko kwenye middleware, Hatua 2).

**Thibitisho**: login kama Admin → ona sidebar kamili. Login kama Staff
aliyeidhinishwa → ona sidebar iliyopunguzwa (bila Finance/Billing/Reports).

---

## HATUA 4 — Finance/Accounting Module (Kipaumbele 1)

Jenga kwa mpangilio huu mdogo mdogo (kila kimoja kithibitishwe kabla
ya kinachofuata):

1. **Expense tracking**: `POST/GET /api/expenses` + fomu ya kuongeza
   matumizi (category, amount, tarehe, maelezo). Thibitisho: ongeza
   expense 3, angalia zimehifadhiwa kwa Decimal sahihi kwenye DB.
2. **Revenue kutoka Invoices**: query inayohesabu jumla ya `payments`
   zilizolipwa kwa kipindi fulani (hii itategemea Billing module ya
   Hatua 5 — unaweza kuandaa query tu sasa, ijaribu kikamilifu baada
   ya Hatua 5).
3. **Finance Dashboard** (`/finance`): cards za Mapato ya Leo/Mwezi,
   Matumizi ya Leo/Mwezi, Net Profit, Outstanding Invoices — vyote
   vikitumia SQL aggregate queries (SUM) kwenye Decimal columns.
4. **P&L Report** na date filters (Daily/Weekly/Monthly/Yearly/Custom)
   — jenga endpoint moja `GET /api/reports/pnl?from=&to=` inayorudisha
   JSON, kisha UI juu yake.
5. **Export PDF/Excel**: Tumia `@react-pdf/renderer` kwa PDF (halisi,
   si screenshot). Kwa Excel, ongeza `exceljs` au `xlsx` package.

**Thibitisho la mwisho la Hatua 4**: Ongeza expense na payment za
majaribio, pakua P&L PDF, fungua faili na uhakikishe namba
zinalingana na zilizo kwenye dashboard.

---

## HATUA 5 — Billing/Invoices Module (Kipaumbele 2)

1. **Clients**: CRUD ya client records (jina, mawasiliano, aina).
2. **Quotation → Invoice flow**:
   - Tengeneza Quotation (items, quantity, unit price → total kwa
     Decimal arithmetic, si float).
   - Button "Convert to Invoice" — inatengeneza Invoice mpya
     ikirejelea Quotation kupitia `converted_from_id`.
3. **Payments**: `POST /api/invoices/[id]/payments` — LAZIMA iwe ndani
   ya `withTransaction`: ongeza payment + sasisha `amount_paid` na
   `payment_status` ya invoice kwa wakati mmoja (atomic).
4. **Invoice PDF**: tumia `@react-pdf/renderer` — hati halisi
   yenye company letterhead ya msingi (bila urembo bado), logo
   ikiwa ipo.
5. **Outstanding Payments list** + **Payment History kwa kila client**.

**Thibitisho**: Tengeneza Quotation → geuza kuwa Invoice → rekodi
malipo mawili sehemu (partial) → hakikisha `payment_status` inabadilika
kuwa PARTIAL kisha PAID kiotomatiki → pakua Invoice PDF halisi.

Baada ya hii, rudi Hatua 4.2-4.3 uthibitishe Revenue/Dashboard
inasoma data halisi ya Invoices/Payments.

---

## HATUA 6 — Staff Management Module (Kipaumbele 3)

1. **Staff records CRUD**: ongeza taaluma, leseni + tarehe ya kuisha
   (expiry alert query tayari ipo — `listExpiringLicenses`), tarehe ya
   kuanza kazi.
2. **Payroll**:
   - Fomu ya kuhesabu: mshahara wa msingi + allowances − NSSF (kawaida
     10%) − PAYE (bracket za kodi Tanzania) = Net Pay.
   - Weka hesabu za NSSF/PAYE kwenye function moja safi
     (`src/lib/payroll/calculate.ts`) inayoweza kupimwa (unit-testable),
     ikitumia Decimal.js kuepuka makosa ya float.
   - `POST /api/payroll` — LAZIMA iwe ndani ya transaction.
   - Historia ya malipo kwa mwezi (`GET /api/payroll?staffId=&year=`).
3. **Leave Management**: Staff anaomba (`POST /api/leave-requests`),
   Admin anaidhinisha/anakataa (`PATCH /api/leave-requests/[id]`) —
   ikipunguza `leave_balance_days` moja kwa moja ikiwa imeidhinishwa.
4. **Performance tracking**: itakuwa placeholder tu (idadi ya visits =
   0) mpaka Bookings/Home Visits (Phase 2 & 4) zijengwe — usijaribu
   kujenga hii sasa, weka "Coming Soon" au namba tuli (0).

**Thibitisho**: ongeza Staff mpya → hesabu Payroll ya mwezi → hakikisha
Net Pay ni sahihi kwa mkono (kokotoa mwenyewe kwa calculator, linganisha)
→ omba likizo kama Staff → idhinisha kama Admin → angalia balance
imepungua.

---

## HATUA 7 — Dashboard Kuu (Summary cards)

Baada ya Hatua 4-6 kukamilika, jenga `/dashboard` (ukurasa wa kwanza
baada ya login) yenye summary cards zote sita zilizoainishwa kwenye
master prompt (Mapato ya Mwezi, Matumizi ya Mwezi, Net Profit,
Outstanding Invoices, Staff Wanaofanya Kazi, Payroll ya Mwezi Huu) —
zote zikitoa data halisi kutoka DB, si namba za bandia (mock).

**Hii ndiyo mwisho wa Phase 1.** Simama hapa, thibitisha kila kitu
kimefanya kazi kikamilifu, kabla ya kuendelea na Phase 2.

---

## RAMANI YA PHASES ZINAZOFUATA (baada ya Phase 1 kuthibitishwa)

Usianze hizi mpaka Phase 1 ithibitishwe 100%. Kila moja ni ombi jipya
tofauti kwa Claude Code, siku tofauti:

| Phase | Kipaumbele | Maelezo mafupi |
|---|---|---|
| 2 | Bookings | Booking lifecycle (New→Completed), assign staff, timeline |
| 3 | Patients (EMR) | Medical history, allergies, medication, documents |
| 4 | Home Visits | Vitals, treatment notes, GPS check-in, huunganisha na Patient + Invoice |
| 5 | Inventory | Medicines/equipment, stock in/out, expiry alerts |
| 6 | Reports + Documents | Reports za kina + document management |
| 7 | Website Integration | afyanyumbani.com requests → ERP (badala ya/pamoja na WhatsApp ya sasa) |
| 8 | AI Assistant | Claude API kwa summaries, insights, natural language search |
| 9 | UI/UX Polish | Rangi (#0D4EA6 Blue, #F58220 Orange), animations, responsive kamili |

Kwa kila phase mpya, mwambie Claude Code kwanza: *"Soma PLAN.md na
CLAUDE.md, kisha jenga TU [jina la Phase], kwa mpangilio mdogo mdogo
kama Phase 1, ukithibitisha kila sehemu."*

---

## ORODHA YA KUANGALIA (checklist) YA KILA "HATUA NDOGO"

Kabla ya kusema hatua ndogo yoyote imekamilika, hakikisha:

- [ ] Feature inaonekana kwenye Sidebar (kama inahitajika)
- [ ] Fedha zote ni Decimal/NUMERIC, si float
- [ ] Operesheni za fedha ziko ndani ya transaction
- [ ] Route za Admin-only zina ulinzi wa server-side (si UI tu)
- [ ] Jaribio halisi limefanyika (curl / DB query / UI click) na
      matokeo yameonyeshwa
- [ ] Hakuna 404 au link iliyovunjika popote kwenye Sidebar
