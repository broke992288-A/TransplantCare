import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllUnreadAlertCount } from "@/services/statsService";

export function useUnreadAlertCount() {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ["unread-alert-count", user?.id],
    queryFn: fetchAllUnreadAlertCount,
    enabled: !!user && !!role && ["doctor", "admin", "support"].includes(role),
    // Realtime invalidation already pushes new alerts; polling is only a
    // safety net. 30s polling on a 2G link is pure overhead.
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
  });
}
