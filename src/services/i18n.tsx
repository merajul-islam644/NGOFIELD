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
import { blocksClient } from "@/lib/blocks/client";

export type Locale = "en-US" | "de-DE" | "bn-BD";

const STORAGE_KEY = "ngofield.locale.v1";
const MODULES = ["ngofield"] as const;

type Dict = Record<string, string>;

/**
 * Translate keys come from the Blocks localization service, not from inline
 * dictionaries. `blocksClient.localization.load()` is a public, pre-login
 * call that returns the merged key/value map for the requested language and
 * modules. Keys are flattened with `.` (e.g. `nav.dashboard`) and stay that
 * way to keep call sites in Sidebar/Topbar untouched.
 */
async function loadDictionary(locale: Locale): Promise<Dict> {
  try {
    const merged = (await blocksClient.localization.load(locale, [
      ...MODULES,
    ])) as Record<string, unknown> | null | undefined;
    const flat: Dict = {};
    for (const [k, v] of Object.entries(merged ?? {})) {
      if (typeof v === "string") flat[k] = v;
    }
    return flat;
  } catch {
    return {};
  }
}

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en-US";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "en-US" || raw === "de-DE" || raw === "bn-BD") return raw;
  } catch {
    /* ignore */
  }
  return "en-US";
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  ready: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function applyDocumentLang(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
}

// Apply at module load so first paint carries the language.
const INITIAL_LOCALE = readStoredLocale();
applyDocumentLang(INITIAL_LOCALE);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(INITIAL_LOCALE);
  const [dict, setDict] = useState<Dict>({});
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    applyDocumentLang(locale);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void loadDictionary(locale).then((next) => {
      if (cancelled) return;
      setDict(next);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = dict[key] ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (m, k: string) =>
        vars[k] !== undefined ? String(vars[k]) : m,
      );
    },
    [dict],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, ready, t }),
    [locale, setLocale, ready, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
