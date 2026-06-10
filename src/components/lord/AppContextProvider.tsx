import { createContext, useContext, useState, type ReactNode } from "react";

type AppContextType = {
  user: { id: string; name: string } | null;
  setUser: (user: { id: string; name: string } | null) => void;
  isLoading: boolean;
};

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }
  return context;
}

export function AppContextProvider({ children }: { children: ReactNode }) {
  // Mock user for now since Supabase is missing
  const [user, setUser] = useState<{ id: string; name: string } | null>({
    id: "1",
    name: "Commander",
  });
  const [isLoading] = useState(false);

  return (
    <AppContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </AppContext.Provider>
  );
}
