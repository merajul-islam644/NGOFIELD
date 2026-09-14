import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, Users, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { householdService } from "@/services/caseService";
import type { Household } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { useAuth } from "@/services/authService";
import { ProgrammeBadge } from "@/components/domain/StatusBadge";
import { EmptyState } from "@/components/domain/EmptyState";

export default function HouseholdsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    householdService.list().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const v = q.toLowerCase().trim();
    // Field officers only see their assigned households
    let scope = data;
    if (user?.role === "field_officer") {
      scope = scope.filter((h) => h.assignedOfficerId === user.id);
    }
    if (!v) return scope;
    return scope.filter((h) =>
      [h.name, h.id, h.village, h.union, h.district].join(" ").toLowerCase().includes(v),
    );
  }, [q, data, user]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Households</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.role === "field_officer"
            ? "Households assigned to you"
            : `${data.length} households across 4 districts`}
        </p>
      </header>

      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, ID, village, union…"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
          title="No households match your filters"
          description={user?.role === "field_officer" ? "You can only see households in your assigned areas." : "Try adjusting your search."}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((h) => (
            <Link
              key={h.id}
              to={`/households/${h.id}`}
              className="group rounded-xl border bg-card p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                    {initials(h.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{h.id}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{h.village}, {h.union}</p>
                </div>
                {h.activeProgrammes.length > 0 && <Lock className="h-3 w-3 text-muted-foreground/50" />}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="rounded-md px-1.5 text-[10px]">{h.district}</Badge>
                {h.activeProgrammes.map((p) => (
                  <ProgrammeBadge key={p} programme={p} className="px-1.5 text-[10px]" />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{h.members.length} members</span>
                <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">View profile →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
