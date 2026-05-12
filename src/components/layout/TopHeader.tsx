import { Bell, Menu, LogOut, Shield, Stethoscope, LifeBuoy, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import LanguageSelector from "@/components/features/LanguageSelector";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadAlertCount } from "@/hooks/useUnreadAlerts";
import { useNavigate } from "react-router-dom";
import type { AppRole } from "@/types/roles";

interface TopHeaderProps {
  onMenuClick?: () => void;
}

export function TopHeader({ onMenuClick }: TopHeaderProps) {
  const { t } = useLanguage();
  const { user, role, signOut } = useAuth();
  const { data: unreadCount = 0 } = useUnreadAlertCount();
  const navigate = useNavigate();
  const name = user?.user_metadata?.full_name || user?.email || "User";

  const ROLE_META: Record<AppRole, { icon: typeof Shield; cls: string; key: string }> = {
    admin:   { icon: Shield,       cls: "bg-destructive/10 text-destructive border-destructive/30", key: "role.admin" },
    doctor:  { icon: Stethoscope,  cls: "bg-primary/10 text-primary border-primary/30",             key: "role.doctor" },
    support: { icon: LifeBuoy,     cls: "bg-warning/10 text-warning border-warning/30",             key: "role.support" },
    patient: { icon: UserIcon,     cls: "bg-success/10 text-success border-success/30",             key: "role.patient" },
  };
  const roleMeta = role ? ROLE_META[role] : null;
  const RoleIcon = roleMeta?.icon;

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="min-h-14 w-full min-w-0 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 py-2 gap-2 flex-wrap">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="hidden sm:block text-base sm:text-lg font-semibold text-foreground truncate">{t("app.name")}</h1>
      </div>
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        <LanguageSelector />
        <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/alerts")}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
        {roleMeta && RoleIcon && (
          <Badge
            variant="outline"
            className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${roleMeta.cls}`}
            title={t(roleMeta.key)}
          >
            <RoleIcon className="h-3 w-3" />
            {t(roleMeta.key)}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex max-w-[160px] items-center gap-2 px-1.5 sm:max-w-none sm:px-2">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="max-w-28 truncate text-sm font-medium">{name.split("@")[0]}</span>
                {roleMeta && <span className={`text-[10px] font-semibold uppercase tracking-wide ${roleMeta.cls.split(" ").find(c => c.startsWith("text-")) ?? "text-muted-foreground"}`}>{t(roleMeta.key)}</span>}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />{t("nav.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
