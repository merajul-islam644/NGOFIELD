import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  Plus,
  Search as SearchIcon,
  SlidersHorizontal,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { caseService, officerService } from "@/services/caseService";
import type { CaseRecord, CaseStatus, Priority, Programme } from "@/types";
import { formatRelative, cn } from "@/lib/utils";
import { PriorityBadge, ProgrammeBadge, StatusBadge } from "@/components/domain/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";

const STATUSES: CaseStatus[] = ["New", "Under Review", "Approved", "Assigned", "In Progress", "Waiting", "Completed", "Closed", "Rejected"];
const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"];
const PROGRAMMES: Programme[] = ["Education", "Livelihood", "Health"];
const DISTRICTS = ["Kurigram", "Gaibandha", "Jamalpur", "Cox's Bazar"];

export default function CasesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [officers, setOfficers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? "All");
  const [priority, setPriority] = useState<string>("All");
  const [programme, setProgramme] = useState<string>("All");
  const [district, setDistrict] = useState<string>("All");
  const [officerId, setOfficerId] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"updatedAt" | "priority" | "householdName" | "nextFollowUpAt">("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    officerService.list().then(setOfficers);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    caseService
      .list({
        search,
        status: status as any,
        priority: priority as any,
        programme,
        district,
        officerId,
        sortBy,
        sortDir,
      })
      .then((c) => {
        // Server-side scope filter lives in blocks/data/rules.json
        // (Case schema → field_officer → "assignedOfficerId == ${user.id}").
        // The Data Gateway returns only this user's rows; we keep no in-page
        // filter so a stale IAM role cannot leak cross-account data here.
        setCases(c);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [search, status, priority, programme, district, officerId, sortBy, sortDir]);

  // Sync filters into URL
  useEffect(() => {
    const next = new URLSearchParams();
    if (status !== "All") next.set("status", status);
    if (priority !== "All") next.set("priority", priority);
    if (programme !== "All") next.set("programme", programme);
    if (district !== "All") next.set("district", district);
    if (officerId !== "All") next.set("officer", officerId);
    if (sortBy !== "updatedAt") next.set("sort", sortBy);
    if (sortDir !== "desc") next.set("dir", sortDir);
    if (search) next.set("q", search);
    setSearchParams(next, { replace: true });
  }, [status, priority, programme, district, officerId, sortBy, sortDir, search, setSearchParams]);

  const counts = useMemo(() => {
    return {
      total: cases.length,
      open: cases.filter((c) => !["Closed", "Rejected", "Completed"].includes(c.status)).length,
      review: cases.filter((c) => c.status === "Under Review" || c.status === "New").length,
      critical: cases.filter((c) => c.priority === "Critical" || c.priority === "High").length,
    };
  }, [cases]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.total} cases · {counts.open} open · {counts.review} in review · {counts.critical} high/critical
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to="/cases/new"><Plus className="h-4 w-4" />New case</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by case ID, household, village, request…"
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="min-w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All status</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="min-w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All priority</SelectItem>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={programme} onValueChange={setProgramme}>
                <SelectTrigger className="min-w-[140px]"><SelectValue placeholder="Programme" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All programmes</SelectItem>
                  {PROGRAMMES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger className="min-w-[140px]"><SelectValue placeholder="District" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All districts</SelectItem>
                  {DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={officerId} onValueChange={setOfficerId}>
                <SelectTrigger className="min-w-[160px]"><SelectValue placeholder="Officer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All officers</SelectItem>
                  {officers.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <div className="p-6"><Alert variant="danger" title="Failed to load cases">{error}</Alert></div>
          ) : cases.length === 0 ? (
            <EmptyCases />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <Th onClick={() => toggleSort("updatedAt")} className="cursor-pointer">
                      <span className="inline-flex items-center">Case ID <SortIcon col="updatedAt" /></span>
                    </Th>
                    <Th onClick={() => toggleSort("householdName")} className="cursor-pointer">
                      <span className="inline-flex items-center">Household <SortIcon col="householdName" /></span>
                    </Th>
                    <Th>Programme</Th>
                    <Th>Request</Th>
                    <Th>District</Th>
                    <Th>Assigned</Th>
                    <Th onClick={() => toggleSort("priority")} className="cursor-pointer">
                      <span className="inline-flex items-center">Priority <SortIcon col="priority" /></span>
                    </Th>
                    <Th>Status</Th>
                    <Th onClick={() => toggleSort("nextFollowUpAt")} className="cursor-pointer">
                      <span className="inline-flex items-center">Next follow-up <SortIcon col="nextFollowUpAt" /></span>
                    </Th>
                    <Th>Updated</Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cases.map((c) => (
                    <tr key={c.id} className="group transition-colors hover:bg-muted/40">
                      <td className="px-3 py-2.5">
                        <Link to={`/cases/${c.id}`} className="font-medium text-foreground hover:underline">{c.id}</Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link to={`/households/${c.householdId}`} className="hover:underline">{c.householdName}</Link>
                        <p className="text-[11px] text-muted-foreground">{c.householdId}</p>
                      </td>
                      <td className="px-3 py-2.5"><ProgrammeBadge programme={c.programme} /></td>
                      <td className="px-3 py-2.5 max-w-[260px]">
                        <p className="line-clamp-1 text-foreground">{c.request}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{c.district}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-sm">{c.assignedOfficerName}</p>
                      </td>
                      <td className="px-3 py-2.5"><PriorityBadge priority={c.priority} /></td>
                      <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {c.nextFollowUpAt ? formatRelative(c.nextFollowUpAt) : <span className="text-muted-foreground/60">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatRelative(c.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Th({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <th className={cn("px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground", className)} onClick={onClick}>
      {children}
    </th>
  );
}

function EmptyCases() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
        <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-medium">No cases match your filters</p>
      <p className="mt-1 text-xs text-muted-foreground">Try adjusting filters or create a new case.</p>
      <Button asChild className="mt-4">
        <Link to="/cases/new"><Plus className="h-4 w-4" />Create new case</Link>
      </Button>
    </div>
  );
}
