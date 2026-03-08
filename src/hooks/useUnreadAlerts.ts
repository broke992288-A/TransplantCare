import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllUnreadAlertCount } from "@/services/statsService";

export function useUnreadAlertCount() {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ["unread-alert-count", user?.id],
    queryFn: fetchAllUnreadAlertCount,
    enabled: !!user && !!role && ["doctor", "admin", "support"].includes(role),
    refetchInterval: 30000,
  });
}
