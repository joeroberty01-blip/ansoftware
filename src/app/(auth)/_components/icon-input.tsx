"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

interface IconInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  icon: LucideIcon;
  label: string;
  error?: string;
  type?: string;
}

export const IconInput = forwardRef<HTMLInputElement, IconInputProps>(
  function IconInput({ icon: Icon, label, error, type = "text", id, ...props }, ref) {
    const [show, setShow] = useState(false);
    const isPassword = type === "password";

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-zinc-700">
          {label}
        </label>
        <div className="relative">
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            ref={ref}
            id={id}
            type={isPassword ? (show ? "text" : "password") : type}
            className={`w-full rounded-xl border bg-white px-9 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 ${
              error ? "border-red-300" : "border-zinc-200"
            }`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
