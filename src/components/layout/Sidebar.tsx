import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Pill, AlertTriangle, FileText, Activity, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";

export function Sidebar() {
  const location = useLocation();
  const { t } = useLanguage();
  const { role } = useAuth();

  const allNavItems = [
    { icon: LayoutDashboard, label: t("nav.dashboard"), path: "/doctor-dashboard", roles: ["admin", "doctor", "support"] },
    { icon: LayoutDashboard, label: t("nav.dashboard"), path: "/patient/home", roles: ["patient"] },
    { icon: Users, label: t("nav.patients"), path: "/patients", roles: ["admin", "doctor", "support"] },
    { icon: Pill, label: t("nav.medications"), path: "/medications", roles: ["admin", "doctor", "patient"] },
    { icon: AlertTriangle, label: t("nav.alerts"), path: "/alerts", roles: ["admin", "doctor", "support"] },
    { icon: FileText, label: t("nav.reports"), path: "/reports", roles: ["admin", "doctor"] },
    { icon: Activity, label: t("nav.analytics"), path: "/analytics", roles: ["admin", "doctor"] },
  ];

  const navItems = allNavItems.filter(item => !role || item.roles.includes(role));

  return (
    <aside className="w-56 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm leading-tight">{t("app.name")}</span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
