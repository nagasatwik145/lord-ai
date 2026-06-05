import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HudPanelProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

/** Reusable HUD panel with corner brackets and title bar */
export function HudPanel({ title, subtitle, children, className, action }: HudPanelProps) {
  return (
    <section className={cn("hud-panel relative p-4 md:p-5", className)}>
      {/* Corner brackets */}
      <span className="pointer-events-none absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-primary" />
      <span className="pointer-events-none absolute -right-px -top-px h-3 w-3 border-r-2 border-t-2 border-primary" />
      <span className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-primary" />
      <span className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-primary" />

      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3 border-b border-border/60 pb-2">
          <div>
            {title && (
              <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-primary text-glow">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
