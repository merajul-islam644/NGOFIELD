import {
  Mail,
  Shield,
  MapPin,
  FolderKanban,
  ListChecks,
  LogOut,
  ArrowLeft,
  IdCard,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/app/providers/AuthProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { ROLE_LABEL } from "@/services/authService";
import { initials } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const user = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
        <p className="text-sm text-muted-foreground">
          Your account details and active assignments in NGOField.
        </p>
      </header>

      {/* Identity card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl text-white">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-semibold">{user.name}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="info">
                  <Shield className="mr-1 h-3 w-3" /> {ROLE_LABEL[user.role]}
                </Badge>
                {user.district && (
                  <Badge variant="secondary">
                    <MapPin className="mr-1 h-3 w-3" /> {user.district}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdCard className="h-4 w-4" /> Account details
          </CardTitle>
          <CardDescription>
            Information tied to your NGOField account.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="User ID" value={user.id} />
            <Field label="Role" value={ROLE_LABEL[user.role]} />
            <Field
              label="Email"
              value={user.email}
              icon={<Mail className="h-3.5 w-3.5" />}
            />
            {user.district && (
              <Field
                label="District"
                value={user.district}
                icon={<MapPin className="h-3.5 w-3.5" />}
              />
            )}
            {user.programmes && user.programmes.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Programmes
                </dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  <FolderKanban className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  {user.programmes.map((p) => (
                    <Badge key={p} variant="secondary" className="font-normal">
                      {p}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
            {user.assignedAreas && user.assignedAreas.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Assigned areas
                </dt>
                <dd className="mt-2 flex items-start gap-1.5 text-sm">
                  <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{user.assignedAreas.join(", ")}</span>
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Session */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>
            Sign out of NGOField on this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            variant="outline"
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {value}
      </dd>
    </div>
  );
}
