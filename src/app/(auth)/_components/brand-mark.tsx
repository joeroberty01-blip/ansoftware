import { Home, Plus } from "lucide-react";

const SIZE_MAP = {
  sm: { box: "h-10 w-10", icon: "h-5 w-5", badge: "h-4 w-4" },
  md: { box: "h-14 w-14", icon: "h-7 w-7", badge: "h-5 w-5" },
  lg: { box: "h-16 w-16", icon: "h-8 w-8", badge: "h-6 w-6" },
} as const;

export function BrandMark({ size = "md" }: { size?: keyof typeof SIZE_MAP }) {
  const dims = SIZE_MAP[size];
  return (
    <span
      className={`relative inline-flex shrink-0 ${dims.box} items-center justify-center rounded-2xl bg-white shadow-lg shadow-brand-blue/20`}
    >
      <Home className={`${dims.icon} text-brand-blue`} strokeWidth={2.25} />
      <span
        className={`absolute -bottom-1 -right-1 flex ${dims.badge} items-center justify-center rounded-full bg-brand-orange text-white ring-2 ring-white`}
      >
        <Plus className="h-3 w-3" strokeWidth={3} />
      </span>
    </span>
  );
}
