import { Bell, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import LanguageSelector from "@/components/features/LanguageSelector";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadAlertCount } from "@/hooks/useUnreadAlerts";
import { useNavigate } from "react-router-dom";

interface TopHeaderProps {
  onMenuClick?: () => void;
}

export function TopHeader({ onMenuClick }: TopHeaderProps) {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const { data: unreadCount = 0 } = useUnreadAlertCount();
  const navigate = useNavigate();
  const name = user?.user_metadata?.full_name || user?.email || "User";

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex max-w-[140px] items-center gap-2 px-1.5 sm:max-w-none sm:px-2">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-28 truncate text-sm font-medium sm:block">{name.split("@")[0]}</span>
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
