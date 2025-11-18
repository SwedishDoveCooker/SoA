
import React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { load } from "@tauri-apps/plugin-store";
import type { Store as TauriStore } from "@tauri-apps/plugin-store";
import type { Theme } from "@/hooks/useFrontendConfig";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isThemeLoading: boolean;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  isThemeLoading: true,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const storeRef = React.createRef<TauriStore>();

export function ThemeProvider({
  children,
  defaultTheme = "system",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  useEffect(() => {
    async function loadTheme() {
      try {
        const store = await load("frontend-config.json", {
          autoSave: false,
          defaults: {} as Record<string, unknown>,
        });
        storeRef.current = store;

        const storedTheme = await store.get<Theme>("theme");
        const newTheme = storedTheme || defaultTheme;

        setTheme(newTheme);
        applyTheme(newTheme);
      } catch (e) {
        console.error("Failed to load theme from frontend-config.json", e);
        setTheme(defaultTheme);
        applyTheme(defaultTheme);
      } finally {
        setIsThemeLoading(false);
      }
    }
    loadTheme();
  }, [defaultTheme]);

  const applyTheme = (themeToApply: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (themeToApply === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }
    root.classList.add(themeToApply);
  };

  const value = {
    theme,
    isThemeLoading,
    setTheme: (newTheme: Theme) => {
      applyTheme(newTheme);
      setTheme(newTheme);

      async function saveTheme() {
        if (storeRef.current) {
          try {
            await storeRef.current.set("theme", newTheme);
            await storeRef.current.save();
          } catch (e) {
            console.error("Failed to save theme to frontend-config.json", e);
          }
        }
      }
      saveTheme();
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
