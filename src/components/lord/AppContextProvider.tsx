import type React from "react";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { monitoring } from "@/lib/monitoring-service";

export interface AppContextType {
  metrics: {
    latency: number;
    uptime: number;
    apiStatus: string;
    dbStatus: string;
    authStatus: string;
    errorCount: number;
  };
  currentRoute: string;
  activeWorkflow: string | null;
  history: Array<{ timestamp: number; action: string; data?: unknown }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState({
    latency: 0,
    uptime: 0,
    apiStatus: "online",
    dbStatus: "online",
    authStatus: "online",
    errorCount: 0,
  });
  const [currentRoute, setCurrentRoute] = useState("/");
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ timestamp: number; action: string; data?: unknown }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const health = monitoring.getHealthStatus();
      setMetrics((prev) => ({
        ...prev,
        uptime: Math.floor(performance.now() / 1000),
        apiStatus: health === "healthy" ? "online" : health === "warning" ? "degraded" : "offline",
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const value: AppContextType = {
    metrics,
    currentRoute,
    activeWorkflow,
    history,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppContextProvider");
  }
  return context;
}
