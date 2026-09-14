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
  UserCog,
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
import { useAuth, ROLE_LABEL } from "@/services/authService";
import { notificationService } from "@/services/notificationService";
import { useTheme } from "@/services/themeService";
import { useI18n } from "@/services/i18n";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { HOUSEHOLDS } from "@/data/households";
import { caseService } from "@/services/caseService";
import { formatRelative } from "@/lib/utils";
import type { Notification } from "@/types";

export function Topbar({
  onMenuClick,
  searchOpen,
  onSearchOpenChange,
}: {
  onMenuClick: () => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
}) {
  const { user, switchRole, signOut } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const setSearchOpen = onSearchOpenChange;
  const [search, setSearch] = useState("");
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(
    notificationService.list(),
  );

  useEffect(() => {
    const reload = () => setNotifications(notificationService.list());
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, []);

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

  // Load recent cases for search (lazy)
  useEffect(() => {
    if (searchOpen) {
      caseService.list({}).then((cs) => setRecentCases(cs.slice(0, 30)));
    }
  }, [searchOpen]);

  const filteredHouseholds = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return HOUSEHOLDS.slice(0, 6);
    return HOUSEHOLDS.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.id.toLowerCase().includes(q) ||
        h.village.toLowerCase().includes(q) ||
        h.union.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [search]);

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
        <p className="text-xs text-muted-foreground hidden md:block">
          {ROLE_LABEL[user.role]}
        </p>
        <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
          {title}
        </h1>
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

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setNotifOpen(true)}
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
          <DropdownMenuLabel>Switch role (demo)</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => switchRole("field_officer")}>
            <UserCog className="h-4 w-4" /> Field Officer
            {user.role === "field_officer" && (
              <CommandShortcut>active</CommandShortcut>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => switchRole("programme_coordinator")}>
            <UserCog className="h-4 w-4" /> Programme Coordinator
            {user.role === "programme_coordinator" && (
              <CommandShortcut>active</CommandShortcut>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => switchRole("regional_manager")}>
            <UserCog className="h-4 w-4" /> Regional Manager
            {user.role === "regional_manager" && (
              <CommandShortcut>active</CommandShortcut>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notifications sheet */}
      <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{unread} unread</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                notificationService.markAllRead();
                setNotifications(notificationService.list());
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Mark all read
            </Button>
          </div>
          <div className="mt-3 space-y-2 overflow-y-auto pb-8">
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
                  onClick={() => {
                    notificationService.markRead(n.id);
                    setNotifications(notificationService.list());
                    setNotifOpen(false);
                    if (n.href) navigate(n.href);
                  }}
                  className="flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent"
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
        </SheetContent>
      </Sheet>

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
  const ariaLabel = t("topbar.languageActive", {
    name: locale === "bn" ? t("common.bengali") : t("common.english"),
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
        <DropdownMenuItem onClick={() => setLocale("en")}>
          <span className="inline-flex h-4 w-7 items-center justify-center rounded bg-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            EN
          </span>
          {t("common.english")}
          {locale === "en" && (
            <CommandShortcut>{t("common.active")}</CommandShortcut>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale("bn")}>
          <span className="inline-flex h-4 w-7 items-center justify-center rounded bg-muted text-[10px] font-semibold tracking-wider text-muted-foreground">
            বাং
          </span>
          {t("common.bengali")}
          {locale === "bn" && (
            <CommandShortcut>{t("common.active")}</CommandShortcut>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
