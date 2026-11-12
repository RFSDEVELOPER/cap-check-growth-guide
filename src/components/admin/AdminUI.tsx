import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AdminPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function Box({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-3xl border border-border bg-card p-5 md:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-xl">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export type Tone = "good" | "bad" | "warn" | "neutral";

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "eyebrow inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[0.65rem]",
        tone === "good" && "bg-primary text-primary-foreground",
        tone === "bad" && "bg-destructive/15 text-destructive",
        tone === "warn" && "bg-copper/15 text-copper",
        tone === "neutral" && "bg-secondary text-secondary-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone | undefined;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-5",
        tone === "warn" ? "border-copper/40 bg-copper/10" : "border-border bg-card",
      )}
    >
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export const paymentTone = (status: string): Tone =>
  status === "pago" || status === "ativa"
    ? "good"
    : ["recusado", "cancelado", "cancelada", "reembolsado"].includes(status)
      ? "bad"
      : "neutral";

export const fulfillmentTone = (status: string): Tone =>
  status === "entregue"
    ? "good"
    : status === "cancelado"
      ? "bad"
      : status === "enviado"
        ? "neutral"
        : "warn";
