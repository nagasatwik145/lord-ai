import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { monitoring, type SystemMetrics, type AppEvent } from "@/lib/monitoring-service";

interface AppContextType {
  user: { id: string; name: string } | null;
  setUser: (user: { id: string; name: string } | null) => void;
  isLoading: boolean;
  metrics: SystemMetrics;
  events: AppEvent[];
  currentRoute: string;
  history: string[];
  activeWorkflow: string | null;
  setActiveWorkflow: (workflow: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }
  return context;
}

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; name: string } | null>({
    id: "1",
    name: "Commander",
  });
  const [isLoading] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics>(monitoring.getMetrics());
  const [events, setEvents] = useState<AppEvent[]>(monitoring.getRecentEvents());
  const [history, setHistory] = useState<string[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  
  const location = useLocation();
  const currentRoute = location.pathname;

  useEffect(() => {
    const unsubscribe = monitoring.subscribe((newMetrics, newEvents) => {
      setMetrics(newMetrics);
      setEvents(newEvents);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setHistory(prev => {
      const newHistory = [...prev, currentRoute];
      return newHistory.slice(-10); // Keep last 10 routes
    });

    monitoring.logEvent({
      type: "navigation",
      category: "router",
      message: `Navigated to ${currentRoute}`,
      metadata: { path: currentRoute }
    });
  }, [currentRoute]);

  return (
    <AppContext.Provider 
      value={{ 
        user, 
        setUser, 
        isLoading, 
        metrics, 
        events, 
        currentRoute, 
        history,
        activeWorkflow,
        setActiveWorkflow
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
