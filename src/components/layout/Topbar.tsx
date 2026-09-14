import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Menu,
  X,
  Plus,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  LogOut,
  UserCircle,
  RefreshCw,
  Users,
  FolderOpenDot,
  CalendarClock,
  Sun,
  Moon,
  Monitor,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, useUser } from "@/app/providers/AuthProvider";
import { ROLE_LABEL } from "@/services/authService";
import { notificationService } from "@/services/notificationService";
import { useTheme } from "@/services/themeService";
import { useI18n, type Locale } from "@/services/i18n";
import { blocksClient } from "@/lib/blocks/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { caseService, householdService } from "@/services/caseService";
import { formatRelative } from "@/lib/utils";
import type { Household, Notification } from "@/types";

export function Topbar({
  onMenuClick,
  searchOpen,
  onSearchOpenChange,
}: {
  onMenuClick: () => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
}) {
  const user = useUser();
  const { logout } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const setSearchOpen = onSearchOpenChange;
  const [search, setSearch] = useState("");
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Initial load + re-fetch on window focus (e.g. tab switch).
  useEffect(() => {
    let cancelled = false;
    const reload = async () => {
      const next = await notificationService.list();
      if (!cancelled) setNotifications(next);
    };
    void reload();
    const onFocus = () => void reload();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Poll while the dropdown is open so users see fresh items without
  // switching tabs. No polling when closed — the focus handler covers it.
  useEffect(() => {
    if (!notifOpen) return;
    let cancelled = false;
    const reload = async () => {
      const next = await notificationService.list();
      if (!cancelled) setNotifications(next);
    };
    void reload();
    const id = setInterval(reload, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [notifOpen]);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onSearchOpenChange(!searchOpen);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const title = useMemo(() => {
    const PAGE_TITLE_KEYS: Record<string, string> = {
      "/": t("nav.dashboard"),
      "/cases": t("nav.cases"),
      "/cases/new": t("sidebar.newCase"),
      "/households": t("nav.households"),
      "/follow-ups": t("nav.followUps"),
      "/team": t("nav.team"),
      "/programme-reports": t("nav.programmeReports"),
      "/donor-reports": t("nav.donorReports"),
      "/access-logs": t("nav.accessLogs"),
      "/search": t("page.search"),
      "/profile": t("page.profile"),
    };
    const exact = PAGE_TITLE_KEYS[location.pathname];
    if (exact) return exact;
    if (location.pathname.startsWith("/cases/")) return t("page.caseDetail");
    if (location.pathname.startsWith("/households/"))
      return t("page.householdProfile");
    if (location.pathname.startsWith("/programmes/"))
      return t("page.programme");
    return t("app.name");
  }, [location.pathname, t]);

  // Load recent cases + households for search (lazy)
  useEffect(() => {
    if (!searchOpen) return;
    let active = true;
    caseService.list({}).then((cs) => {
      if (active) setRecentCases(cs.slice(0, 30));
    });
    householdService.list().then((hs) => {
      if (active) setHouseholds(hs);
    });
    return () => {
      active = false;
    };
  }, [searchOpen]);

  const filteredHouseholds = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return households.slice(0, 6);
    return households
      .filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.id.toLowerCase().includes(q) ||
          h.village.toLowerCase().includes(q) ||
          h.union.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [search, households]);

  const filteredCases = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return recentCases.slice(0, 6);
    return recentCases
      .filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.householdName.toLowerCase().includes(q) ||
          c.village.toLowerCase().includes(q) ||
          c.request.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [search, recentCases]);

  if (!user) return null;

  const notifIcon = (type: Notification["type"]) => {
    if (type === "warning") return AlertTriangle;
    if (type === "danger") return AlertCircle;
    if (type === "success") return CheckCircle2;
    return Info;
  };
  const notifColor = (type: Notification["type"]) => {
    if (type === "warning")
      return "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300";
    if (type === "danger")
      return "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300";
    if (type === "success")
      return "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    return "bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-card/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/60 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="min-w-0 flex-1">
        {/* <p className="text-xs text-muted-foreground hidden md:block">
          {ROLE_LABEL[user.role]}
        </p>
        <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
          {title}
        </h1> */}
      </div>

      {/* <Button
        variant="soft"
        size="sm"
        onClick={() => navigate("/cases/new")}
        className="hidden md:inline-flex"
      >
        <Plus className="h-4 w-4" />
        New Case
      </Button> */}

      <LanguageToggle />
      <ThemeToggle />

      <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={`Notifications, ${unread} unread`}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <Badge
                variant="danger"
                className="absolute -right-1 -top-1 h-5 min-w-[20px] justify-center rounded-full px-1 text-[10px]"
              >
                {unread}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[380px] p-0">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div>
              <p className="text-sm font-semibold leading-none">Notifications</p>
              <p className="mt-1 text-xs text-muted-foreground">{unread} unread</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await notificationService.markAllRead();
                const next = await notificationService.list();
                setNotifications(next);
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Mark all read
            </Button>
          </div>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto p-1">
            {notifications.length === 0 && (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No notifications.
              </div>
            )}
            {notifications.map((n) => {
              const Icon = notifIcon(n.type);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={async () => {
                    await notificationService.markRead(n.id);
                    const next = await notificationService.list();
                    setNotifications(next);
                    setNotifOpen(false);
                    if (n.href) navigate(n.href);
                  }}
                  className="flex w-full items-start gap-3 rounded-md bg-background p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full ${notifColor(n.type)}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-5">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatRelative(n.at)}
                    </p>
                  </div>
                  {!n.read && (
                    <span
                      className="mt-1.5 h-2 w-2 rounded-full bg-primary"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Profile"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/profile")}>
            <UserCircle className="h-4 w-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Command search */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent size="lg" className="p-0 overflow-hidden">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command shouldFilter={false}>
            <CommandInput
              autoFocus
              placeholder="Search by household ID, case ID, name or village…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              {filteredHouseholds.length > 0 && (
                <CommandGroup heading="Households">
                  {filteredHouseholds.map((h) => (
                    <CommandItem
                      key={h.id}
                      value={h.id}
                      onSelect={() => {
                        navigate(`/households/${h.id}`);
                        setSearchOpen(false);
                      }}
                    >
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{h.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {h.id} · {h.village}, {h.district}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {filteredCases.length > 0 && (
                <CommandGroup heading="Cases">
                  {filteredCases.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.id}
                      onSelect={() => {
                        navigate(`/cases/${c.id}`);
                        setSearchOpen(false);
                      }}
                    >
                      <FolderOpenDot className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{c.id}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {c.householdName} · {c.programme}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup heading="Actions">
                <CommandItem
                  onSelect={() => {
                    navigate("/cases/new");
                    setSearchOpen(false);
                  }}
                >
                  <Plus className="h-4 w-4 text-muted-foreground" /> Create new
                  case
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    navigate("/follow-ups");
                    setSearchOpen(false);
                  }}
                >
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />{" "}
                  Open follow-ups
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </header>
  );
}

function ThemeToggle() {
  const { mode, resolvedTheme, setMode } = useTheme();
  const { t } = useI18n();
  const Icon = resolvedTheme === "dark" ? Moon : Sun;
  const ariaLabel = t("topbar.themeSystem", {
    mode: mode,
    sys: mode === "system" ? t("common.systemTheme") : "",
  });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={ariaLabel}
          title={ariaLabel}
        >
          <Icon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("common.appearance")}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setMode("light")}>
          <Sun className="h-4 w-4" /> {t("common.light")}
          {mode === "light" && (
            <CommandShortcut>{t("common.active")}</CommandShortcut>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode("dark")}>
          <Moon className="h-4 w-4" /> {t("common.dark")}
          {mode === "dark" && (
            <CommandShortcut>{t("common.active")}</CommandShortcut>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setMode("system")}>
          <Monitor className="h-4 w-4" /> {t("common.system")}
          {mode === "system" && (
            <CommandShortcut>{t("common.active")}</CommandShortcut>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const [languages, setLanguages] = useState<Locale[]>([
    "en-US",
    "de-DE",
    "bn-BD",
  ]);

  useEffect(() => {
    let cancelled = false;
    void blocksClient.localization
      .languagesForCurrentTenant()
      .then((res) => {
        if (cancelled) return;
        const codes = (res ?? [])
          .map((entry) => {
            const code =
              (entry as { culture?: string; code?: string }).culture ??
              (entry as { code?: string }).code ??
              "";
            return code;
          })
          .filter(
            (c): c is Locale => c === "en-US" || c === "de-DE" || c === "bn-BD",
          );
        if (codes.length > 0) setLanguages(codes);
      })
      .catch(() => {
        /* keep fallback list */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const labelKey = (code: Locale) => {
    if (code === "en-US") return "common.english";
    if (code === "de-DE") return "common.german";
    return "common.bengali";
  };
  const short = (code: Locale) => code.split("-")[0].toUpperCase();

  const ariaLabel = t("topbar.languageActive", {
    name: t(labelKey(locale)),
  });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={ariaLabel}
          title={ariaLabel}
        >
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t("topbar.language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("topbar.language")}</DropdownMenuLabel>
        {languages.map((code) => (
          <DropdownMenuItem key={code} onClick={() => setLocale(code)}>
            <span className="inline-flex h-4 w-7 items-center justify-center rounded bg-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {short(code)}
            </span>
            {t(labelKey(code))}
            {locale === code && (
              <CommandShortcut>{t("common.active")}</CommandShortcut>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
