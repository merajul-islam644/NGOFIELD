import { Link, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpenDot,
  Users,
  CalendarClock,
  School,
  HeartPulse,
  Briefcase,
  FileBarChart2,
  FileSpreadsheet,
  ScrollText,
  ChevronsLeft,
  Sparkles,
  Plus,
  Search,
} from "lucide-react";
import { useUser } from "@/app/providers/AuthProvider";
import { ROLE_LABEL } from "@/services/authService";
import { useI18n } from "@/services/i18n";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSearch: () => void;
}

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ElementType;
  roles: ("field_officer" | "programme_coordinator" | "regional_manager")[];
  badge?: string;
}

const NAV: { sectionKey: string; items: NavItem[] }[] = [
  {
    sectionKey: "nav.workspace",
    items: [
      {
        to: "/",
        labelKey: "nav.dashboard",
        icon: LayoutDashboard,
        roles: ["field_officer", "programme_coordinator", "regional_manager"],
      },
      {
        to: "/cases",
        labelKey: "nav.cases",
        icon: FolderOpenDot,
        roles: ["field_officer", "programme_coordinator", "regional_manager"],
      },
      {
        to: "/households",
        labelKey: "nav.households",
        icon: Users,
        roles: ["field_officer", "programme_coordinator", "regional_manager"],
      },
      {
        to: "/follow-ups",
        labelKey: "nav.followUps",
        icon: CalendarClock,
        roles: ["field_officer", "programme_coordinator", "regional_manager"],
        badge: "16",
      },
    ],
  },
  {
    sectionKey: "nav.programmes",
    items: [
      {
        to: "/programmes/education",
        labelKey: "nav.education",
        icon: School,
        roles: ["programme_coordinator", "regional_manager"],
      },
      {
        to: "/programmes/livelihood",
        labelKey: "nav.livelihood",
        icon: Briefcase,
        roles: ["programme_coordinator", "regional_manager"],
      },
      {
        to: "/programmes/health",
        labelKey: "nav.health",
        icon: HeartPulse,
        roles: ["programme_coordinator", "regional_manager"],
      },
    ],
  },
  {
    sectionKey: "nav.operations",
    items: [
      {
        to: "/team",
        labelKey: "nav.team",
        icon: Users,
        roles: ["programme_coordinator", "regional_manager"],
      },
      {
        to: "/programme-reports",
        labelKey: "nav.programmeReports",
        icon: FileBarChart2,
        roles: ["programme_coordinator", "regional_manager"],
      },
      {
        to: "/donor-reports",
        labelKey: "nav.donorReports",
        icon: FileSpreadsheet,
        roles: ["regional_manager", "programme_coordinator"],
      },
      {
        to: "/access-logs",
        labelKey: "nav.accessLogs",
        icon: ScrollText,
        roles: ["programme_coordinator", "regional_manager"],
      },
    ],
  },
];

export function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
  onOpenSearch,
}: SidebarProps) {
  const user = useUser();
  const { t } = useI18n();
  const location = useLocation();
  if (!user) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-card transition-[width,transform] duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0",
          collapsed ? "md:w-[68px]" : "md:w-64",
          open ? "translate-x-0 w-72" : "-translate-x-full w-72",
        )}
        aria-label="Primary navigation"
      >
        <div
          className={cn(
            "flex items-center gap-2.5 px-4 h-16 border-b",
            collapsed && "md:justify-center md:px-2",
          )}
        >
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">
                {t("app.name")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("app.tagline")}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="ml-auto hidden md:inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          >
            <ChevronsLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180",
              )}
            />
          </button>
        </div>

        {/* Search trigger (opens ⌘K palette) — desktop only */}
        {!collapsed && (
          <div className="hidden md:block px-3 pt-3">
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 truncate text-left">
                Search households, cases, villages…
              </span>
              <span className="kbd">⌘K</span>
            </button>
          </div>
        )}

        {/* Search — desktop only
        {!collapsed && (
          <div className="hidden md:block px-3 pt-3">
            <Link
              to="/search"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1">{t("sidebar.search")}</span>
              <span className="kbd">⌘K</span>
            </Link>
          </div>
        )} */}

        {/* New case button */}
        <div className={cn("px-3 pt-3", collapsed && "md:px-2")}>
          <Link
            to="/cases/new"
            onClick={onClose}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90",
              collapsed && "md:h-10 md:w-10 md:p-0",
            )}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span>{t("sidebar.newCase")}</span>}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Sections">
          {NAV.map((group) => {
            const visibleItems = group.items.filter((it) =>
              it.roles.includes(user.role),
            );
            if (!visibleItems.length) return null;
            return (
              <div key={group.sectionKey} className="mb-4">
                {!collapsed && (
                  <p className="section-title mb-1.5 px-2">
                    {t(group.sectionKey)}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active =
                      location.pathname === item.to ||
                      location.pathname.startsWith(item.to + "/");
                    const label = t(item.labelKey);
                    const link = (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/"}
                        onClick={onClose}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                          collapsed && "md:justify-center md:px-2",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
                        {!collapsed && (
                          <span className="flex-1 truncate">{label}</span>
                        )}
                        {!collapsed && item.badge && (
                          <Badge
                            variant="warning"
                            className="ml-auto h-5 rounded-md px-1.5 text-[10px]"
                          >
                            {item.badge}
                          </Badge>
                        )}
                        {active && (
                          <span
                            className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-primary"
                            aria-hidden
                          />
                        )}
                      </NavLink>
                    );
                    if (collapsed) {
                      return (
                        <li key={item.to}>
                          <Tooltip>
                            <TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right">
                              {label}
                            </TooltipContent>
                          </Tooltip>
                        </li>
                      );
                    }
                    return <li key={item.to}>{link}</li>;
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className={cn("border-t p-3", collapsed && "md:p-2")}>
          <div
            className={cn(
              "flex items-center gap-3 rounded-md p-2 hover:bg-accent",
              collapsed && "md:justify-center",
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {ROLE_LABEL[user.role]}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
