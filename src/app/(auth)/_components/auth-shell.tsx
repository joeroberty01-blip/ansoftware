import { Users, Users2, BarChart3, ShieldCheck } from "lucide-react";
import { BrandMark } from "./brand-mark";

const FEATURES = [
  {
    icon: Users,
    label: "Patient Management",
    desc: "Register, manage and track patient information easily.",
  },
  {
    icon: Users2,
    label: "Staff & Services",
    desc: "Manage staff, roles and healthcare services.",
  },
  {
    icon: BarChart3,
    label: "Reports & Operations",
    desc: "Generate reports and make data-driven decisions.",
  },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1">
      <div className="relative hidden w-[46%] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0b2a63] via-brand-blue-dark to-[#071230] p-10 text-white lg:flex xl:p-12">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-orange/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 flex flex-col gap-10">
          <div className="flex flex-col items-start gap-4">
            <BrandMark size="lg" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                <span className="text-white">AFYA</span>{" "}
                <span className="text-brand-orange">NYUMBANI</span>
              </h1>
              <span className="mt-1.5 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-blue-50">
                ERP
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              Manage. <span className="text-brand-orange">Care.</span> Grow.
            </h2>
            <div className="mt-2 h-1 w-14 rounded-full bg-brand-orange" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-blue-100/80">
              Afya Nyumbani ERP helps you manage healthcare services, staff,
              patients and operations — all in one place.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <f.icon className="h-5 w-5 text-white" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {f.label}
                  </p>
                  <p className="text-xs leading-relaxed text-blue-100/70">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-blue-50">
          <ShieldCheck className="h-4 w-4 text-brand-orange" />
          Secure. Reliable. Built for Healthcare.
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-10">
        {children}
      </div>
    </div>
  );
}
