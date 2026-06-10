import { Cpu, Activity, Clock } from "lucide-react";
import { HudPanel } from "./HudPanel";

export function HealthHud() {
  return (
    <HudPanel title="System Health" subtitle="Real-time status" className="mb-4 w-64">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md border border-border/60 bg-background/40 p-2">
          <div className="flex items-center justify-center text-primary">
            <Cpu className="h-4 w-4" />
          </div>
          <div className="mt-1 font-display text-sm text-[var(--hud-success)]">Online</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Engine</div>
        </div>
        <div className="rounded-md border border-border/60 bg-background/40 p-2">
          <div className="flex items-center justify-center text-primary">
            <Activity className="h-4 w-4" />
          </div>
          <div className="mt-1 font-display text-sm text-foreground">42ms</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Latency</div>
        </div>
        <div className="rounded-md border border-border/60 bg-background/40 p-2">
          <div className="flex items-center justify-center text-primary">
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-1 font-display text-sm text-foreground">∞</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Uptime</div>
        </div>
      </div>
      <div className="mt-4 rounded-md border border-border/60 bg-background/40 p-3 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--hud-success)] animate-pulse" />
          <span>All modules operational</span>
        </div>
      </div>
    </HudPanel>
  );
}
