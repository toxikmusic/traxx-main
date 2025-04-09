import { createContext, useContext, useEffect, useState } from "react";
import { getSystemTheme, applyTheme } from "@/lib/utils";

type Theme = {
  theme: "dark" | "light" | "system";
  setTheme: (theme: "dark" | "light" | "system") => void;
};

const initialState: Theme = {
  theme: "system",
  setTheme: () => null,
};

const ThemeContext = createContext<Theme>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: {
  children: React.ReactNode;
  defaultTheme?: "dark" | "light" | "system";
  storageKey?: string;
}) {
  const [theme, setTheme] = useState<"dark" | "light" | "system">(
    () => {
      try {
        // Try to get theme from local storage
        const storedTheme = localStorage.getItem(storageKey);
        if (storedTheme) {
          return storedTheme as "dark" | "light" | "system";
        }
        
        // If no theme in storage, check system preference
        return defaultTheme;
      } catch (error) {
        // In case of error (e.g., localStorage not available)
        return defaultTheme;
      }
    }
  );

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === "system") {
      const systemTheme = getSystemTheme();
      root.classList.remove("light", "dark");
      root.classList.add(systemTheme);
    } else {
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    }
    
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      // Handle error if localStorage is not available
      console.error("Error saving theme preference:", error);
    }
  }, [theme, storageKey]);

  // Watch for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const onSystemThemeChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };
    
    // Listen for system theme changes
    mediaQuery.addEventListener("change", onSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener("change", onSystemThemeChange);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
};