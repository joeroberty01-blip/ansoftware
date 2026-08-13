@AGENTS.md

# Afya Nyumbani Healthcare ERP — Kanuni za Ujenzi

Soma `PLAN.md` kwanza — ndani yake kuna mkakati kamili wa hatua kwa hatua
wa mradi mzima (Phase 1 hadi 9) pamoja na maelezo ya hali ya sasa.

## Kanuni za msingi (LAZIMA zifuatwe kikamilifu)

1. Jenga PHASE MOJA / HATUA MOJA kwa wakati mmoja. Usianze inayofuata
   mpaka iliyopita ithibitishwe imefanya kazi.
2. Baada ya kila hatua/sehemu, THIBITISHA kwa vitendo (curl kwenye API,
   psql query kuonyesha data halisi, au screenshot) — si maneno tu
   "nimekamilisha".
3. Kila feature mpya LAZIMA ionekane kwenye Sidebar. Pages za baadaye
   ziwe na ukurasa "Coming Soon" ulio wazi, si link zilizovunjika/404.
4. Fedha zote (bei, malipo, mishahara) LAZIMA zitumie Decimal/NUMERIC
   (kamwe si float/number ya kawaida ya JS kwa hesabu za pesa).
5. Operesheni zote za fedha ziwe ndani ya database transaction
   (`withTransaction` helper kutoka `src/lib/db.ts`).
6. USIONGEZE features ambazo hazijaombwa kwenye phase/hatua ya sasa.
7. Kabla ya kudai kazi imekamilika, endesha jaribio halisi
   (add/edit/delete/calculate) na uonyeshe matokeo halisi.
8. Route za Admin-only zina ulinzi wa server-side (middleware/session
   check), si UI check tu.

## Muhimu kuhusu Prisma (usipoteze muda)

Prisma CLI (`prisma generate` / `prisma migrate`) HAIWEZI kufanya kazi
kwenye mazingira haya kwa sababu inahitaji kufikia `binaries.prisma.sh`
ambayo haipatikani. Tumia PostgreSQL + `pg` (node-postgres) moja kwa
moja badala yake:

- Schema ya database: `prisma/init.sql` (SQL ya raw, tayari imetumika
  kwenye database `afya_nyumbani_erp`)
- DB helpers: `src/lib/db.ts` (`query`, `queryOne`, `withTransaction`)
- Types: `src/lib/types.ts`
- Data-access functions: `src/lib/repo/*.ts`

Kama mazingira mapya yana mtandao wa kawaida (si sandbox yenye
vikwazo), Prisma CLI halisi inaweza kujaribiwa tena — lakini kwa sasa
mkakati huu wa raw SQL ndio unaotumika na unaofanya kazi.

## Database ya sasa (dev)

```
DATABASE_URL="postgresql://afya_admin:afya_dev_pass_2026@localhost:5432/afya_nyumbani_erp?schema=public"
```

Hii ni database ya maendeleo TU (dev). Badilisha password/credentials
kabla ya production.

