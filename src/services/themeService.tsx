import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "ngofield.theme.v1";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  cycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

function applyResolved(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = resolved;
}

// Best-effort: apply before React mounts so the first paint matches.
const INITIAL_MODE = readStoredMode();
applyResolved(INITIAL_MODE === "system" ? getSystemTheme() : INITIAL_MODE);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(INITIAL_MODE);
  const [systemDark, setSystemDark] = useState<boolean>(
    () => getSystemTheme() === "dark",
  );

  const resolvedTheme: ResolvedTheme =
    mode === "system" ? (systemDark ? "dark" : "light") : mode;

  // Apply before paint to avoid a flash of the wrong palette.
  useLayoutEffect(() => {
    applyResolved(resolvedTheme);
  }, [resolvedTheme]);

  // Track OS preference only while we're in "system" mode.
  useEffect(() => {
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [mode]);

  // Persist the chosen mode.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
  }, []);

  const cycle = useCallback(() => {
    setModeState((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, setMode, cycle }),
    [mode, resolvedTheme, setMode, cycle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
