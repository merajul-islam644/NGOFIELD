import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, Users, FolderOpenDot, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { caseService, householdService } from "@/services/caseService";
import { useUser } from "@/app/providers/AuthProvider";
import { EmptyState } from "@/components/domain/EmptyState";
import { StatusBadge, ProgrammeBadge } from "@/components/domain/StatusBadge";

export default function SearchPage() {
  const user = useUser();
  const [q, setQ] = useState("");
  const [cases, setCases] = useState<any[]>([]);
  const [households, setHouseholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([caseService.list({}), householdService.list()]).then(([cs, hs]) => {
      setCases(cs);
      setHouseholds(hs);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const v = q.toLowerCase().trim();
    if (!v) return { c: [], h: [] };
    let c = cases.filter((x) =>
      [x.id, x.householdName, x.householdId, x.village, x.union, x.district, x.request, x.assignedOfficerName]
        .join(" ")
        .toLowerCase()
        .includes(v),
    );
    let h = households.filter((x) =>
      [x.name, x.id, x.village, x.union, x.district].join(" ").toLowerCase().includes(v),
    );
    // Field officer scope
    if (user?.role === "field_officer") {
      c = c.filter((x) => x.assignedOfficerId === user.id);
      h = h.filter((x) => x.assignedOfficerId === user.id);
    }
    return { c: c.slice(0, 30), h: h.slice(0, 30) };
  }, [q, cases, households, user]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">Household ID · Case ID · Beneficiary name · Village · Case reference</p>
      </header>

      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search households, cases, villages…"
              className="h-11 pl-9 text-base"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : q.trim().length === 0 ? (
        <EmptyState title="Start typing to search" description="Try a household ID, case ID, beneficiary name or village." />
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({filtered.c.length + filtered.h.length})</TabsTrigger>
            <TabsTrigger value="households">Households ({filtered.h.length})</TabsTrigger>
            <TabsTrigger value="cases">Cases ({filtered.c.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filtered.h.length === 0 && filtered.c.length === 0 ? (
              <EmptyState title="No results" description="Try a different term." />
            ) : (
              <>
                {filtered.h.length > 0 && (
                  <Section title="Households" icon={Users}>
                    <ul className="divide-y rounded-lg border bg-card">
                      {filtered.h.slice(0, 5).map((h) => (
                        <li key={h.id}>
                          <Link to={`/households/${h.id}`} className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-accent">
                            <div>
                              <p className="text-sm font-medium">{h.name}</p>
                              <p className="text-xs text-muted-foreground">{h.id} · {h.village}, {h.union}, {h.district}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
                {filtered.c.length > 0 && (
                  <Section title="Cases" icon={FolderOpenDot}>
                    <ul className="divide-y rounded-lg border bg-card">
                      {filtered.c.slice(0, 5).map((c) => (
                        <li key={c.id}>
                          <Link to={`/cases/${c.id}`} className="flex items-start justify-between gap-3 p-3 transition-colors hover:bg-accent">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{c.id} · {c.householdName}</p>
                              <p className="line-clamp-1 text-xs text-muted-foreground">{c.request}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <ProgrammeBadge programme={c.programme} />
                              <StatusBadge status={c.status} />
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="households">
            {filtered.h.length === 0 ? <EmptyState title="No households" /> : (
              <ul className="divide-y rounded-lg border bg-card">
                {filtered.h.map((h) => (
                  <li key={h.id}>
                    <Link to={`/households/${h.id}`} className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-accent">
                      <div>
                        <p className="text-sm font-medium">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{h.id} · {h.village}, {h.union}, {h.district}</p>
                      </div>
                      <Badge variant="outline">{h.activeProgrammes.length} active</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="cases">
            {filtered.c.length === 0 ? <EmptyState title="No cases" /> : (
              <ul className="divide-y rounded-lg border bg-card">
                {filtered.c.map((c) => (
                  <li key={c.id}>
                    <Link to={`/cases/${c.id}`} className="flex items-start justify-between gap-3 p-3 transition-colors hover:bg-accent">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{c.id} · {c.householdName}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{c.request}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <ProgrammeBadge programme={c.programme} />
                        <StatusBadge status={c.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      {children}
    </div>
  );
}
