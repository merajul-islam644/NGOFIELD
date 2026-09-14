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

export type Locale = "en" | "bn";

const STORAGE_KEY = "ngofield.locale.v1";

type Dict = Record<string, string>;

const en: Dict = {
  // App
  "app.name": "NGOField",
  "app.tagline": "Case Management",
  "app.description": "Beneficiary Request & Case Follow-up",

  // Sidebar
  "nav.dashboard": "Dashboard",
  "nav.cases": "Cases",
  "nav.households": "Households",
  "nav.followUps": "Follow-ups",
  "nav.education": "Education",
  "nav.livelihood": "Livelihood",
  "nav.health": "Health",
  "nav.team": "Team & Assignments",
  "nav.programmeReports": "Programme Reports",
  "nav.donorReports": "Donor Reports",
  "nav.accessLogs": "Access Logs",
  "nav.workspace": "Workspace",
  "nav.programmes": "Programmes",
  "nav.operations": "Operations",
  "sidebar.newCase": "New Case",
  "sidebar.search": "Search…",
  "sidebar.expand": "Expand sidebar",
  "sidebar.collapse": "Collapse sidebar",

  // Topbar
  "topbar.searchPlaceholder": "Search households, cases, villages…",
  "topbar.notifications": "Notifications",
  "topbar.unread": "{n} unread",
  "topbar.markAllRead": "Mark all read",
  "topbar.profile": "Profile",
  "topbar.switchRole": "Switch role (demo)",
  "topbar.fieldOfficer": "Field Officer",
  "topbar.programmeCoordinator": "Programme Coordinator",
  "topbar.regionalManager": "Regional Manager",
  "topbar.theme": "Theme",
  "topbar.language": "Language",
  "topbar.themeSystem": "Theme: {mode}{sys}",
  "topbar.languageActive": "Language: {name}",

  // Common
  "common.active": "active",
  "common.systemTheme": " (system)",
  "common.english": "English",
  "common.bengali": "বাংলা",
  "common.light": "Light",
  "common.dark": "Dark",
  "common.system": "System",
  "common.appearance": "Appearance",

  // Pages / titles
  "page.caseDetail": "Case detail",
  "page.householdProfile": "Household profile",
  "page.programme": "Programme",
};

const bn: Dict = {
  // App
  "app.name": "এনজিওফিল্ড",
  "app.tagline": "কেস ম্যানেজমেন্ট",
  "app.description": "উপকারভোগীর অনুরোধ ও কেস ফলো-আপ",

  // Sidebar
  "nav.dashboard": "ড্যাশবোর্ড",
  "nav.cases": "কেসসমূহ",
  "nav.households": "পরিবার",
  "nav.followUps": "ফলো-আপ",
  "nav.education": "শিক্ষা",
  "nav.livelihood": "জীবিকা",
  "nav.health": "স্বাস্থ্য",
  "nav.team": "টিম ও বরাদ্দ",
  "nav.programmeReports": "কর্মসূচি প্রতিবেদন",
  "nav.donorReports": "দাতা প্রতিবেদন",
  "nav.accessLogs": "অ্যাক্সেস লগ",
  "nav.workspace": "কর্মক্ষেত্র",
  "nav.programmes": "কর্মসূচি",
  "nav.operations": "কার্যক্রম",
  "sidebar.newCase": "নতুন কেস",
  "sidebar.search": "অনুসন্ধান…",
  "sidebar.expand": "সাইডবার বিস্তৃত করুন",
  "sidebar.collapse": "সাইডবার সংকুচিত করুন",

  // Topbar
  "topbar.searchPlaceholder": "পরিবার, কেস বা গ্রাম খুঁজুন…",
  "topbar.notifications": "বিজ্ঞপ্তি",
  "topbar.unread": "{n}টি অপঠিত",
  "topbar.markAllRead": "সব পঠিত হিসেবে চিহ্নিত করুন",
  "topbar.profile": "প্রোফাইল",
  "topbar.switchRole": "ভূমিকা পরিবর্তন (ডেমো)",
  "topbar.fieldOfficer": "ফিল্ড অফিসার",
  "topbar.programmeCoordinator": "কর্মসূচি সমন্বয়কারী",
  "topbar.regionalManager": "আঞ্চলিক ব্যবস্থাপক",
  "topbar.theme": "থিম",
  "topbar.language": "ভাষা",
  "topbar.themeSystem": "থিম: {mode}{sys}",
  "topbar.languageActive": "ভাষা: {name}",

  // Common
  "common.active": "সক্রিয়",
  "common.systemTheme": " (সিস্টেম)",
  "common.english": "English",
  "common.bengali": "বাংলা",
  "common.light": "হালকা",
  "common.dark": "গাঢ়",
  "common.system": "সিস্টেম",
  "common.appearance": "চেহারা",

  // Pages / titles
  "page.caseDetail": "কেস বিস্তারিত",
  "page.householdProfile": "পরিবারের প্রোফাইল",
  "page.programme": "কর্মসূচি",
};

const TRANSLATIONS: Record<Locale, Dict> = { en, bn };

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "en" || raw === "bn") return raw;
  } catch {
    /* ignore */
  }
  return "en";
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
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

  useLayoutEffect(() => {
    applyDocumentLang(locale);
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
      const dict = TRANSLATIONS[locale] ?? en;
      const fallback = TRANSLATIONS.en;
      const raw = dict[key] ?? fallback[key] ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (m, k: string) =>
        vars[k] !== undefined ? String(vars[k]) : m,
      );
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
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
