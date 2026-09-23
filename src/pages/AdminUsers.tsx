import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, Users } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { SkeletonTable } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/utils/errorHandler";
import type { AppRole } from "@/types/roles";
import {
  ADMIN_MANAGED_ROLES, confirmUserEmail, fetchAdminUsers, primaryRole, updateUserRole,
  type AdminUserRow,
} from "@/services/adminUserService";

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  doctor: "Shifokor",
  support: "Yordamchi",
  patient: "Bemor",
};

const ROLE_BADGE: Record<AppRole, string> = {
  admin: "bg-primary text-primary-foreground",
  doctor: "bg-secondary text-secondary-foreground",
  support: "bg-muted text-muted-foreground",
  patient: "bg-accent text-accent-foreground",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminUsers() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [target, setTarget] = useState<AdminUserRow | null>(null);
  const [nextRole, setNextRole] = useState<AppRole>("patient");
  const [confirmTarget, setConfirmTarget] = useState<AdminUserRow | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) => updateUserRole(userId, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Rol yangilandi", description: "Foydalanuvchi roli muvaffaqiyatli o'zgartirildi." });
      setTarget(null);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: getErrorMessage(err),
      });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const role = primaryRole(u.roles);
      if (roleFilter !== "all") {
        if (roleFilter === "none" ? role !== null : role !== roleFilter) return false;
      }
      if (!q) return true;
      return (
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const openDialog = (row: AdminUserRow) => {
    setTarget(row);
    setNextRole(primaryRole(row.roles) ?? "patient");
  };

  return (
    <DashboardLayout>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Foydalanuvchilar
              {!isLoading && (
                <span className="text-sm font-normal text-muted-foreground">({users.length})</span>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tizim foydalanuvchilari va ularning rollarini boshqarish. Faqat administratorlar uchun.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm sm:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Email yoki ism bo'yicha qidirish"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha rollar</SelectItem>
                {ADMIN_MANAGED_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
                <SelectItem value="none">Rol berilmagan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <SkeletonTable rows={8} cols={6} />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Foydalanuvchi topilmadi"
                description="Qidiruv yoki filtr shartlarini o'zgartirib ko'ring."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ism</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Email tasdiqlangan</TableHead>
                    <TableHead>Oxirgi kirish</TableHead>
                    <TableHead>Ro'yxatdan o'tgan</TableHead>
                    <TableHead className="text-right">Amal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const role = primaryRole(u.roles);
                    const isSelf = u.id === user?.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.full_name ?? "—"}
                          {isSelf && <span className="ml-2 text-xs text-muted-foreground">(siz)</span>}
                        </TableCell>
                        <TableCell className="break-all text-muted-foreground">{u.email ?? "—"}</TableCell>
                        <TableCell>
                          {role ? (
                            <Badge className={ROLE_BADGE[role]}>{ROLE_LABEL[role]}</Badge>
                          ) : (
                            <Badge variant="outline">Rol berilmagan</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.email_confirmed
                            ? <Badge variant="outline">Ha</Badge>
                            : <Badge variant="destructive">Yo'q</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(u.last_sign_in_at)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSelf}
                            title={isSelf ? "O'z rolingizni o'zgartirish mumkin emas" : undefined}
                            onClick={() => openDialog(u)}
                          >
                            Rolni o'zgartirish
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={target !== null} onOpenChange={(open) => { if (!open) setTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rolni o'zgartirish</DialogTitle>
            <DialogDescription>
              {target?.email ?? target?.full_name ?? ""} uchun yangi rolni tanlang. Eski rol olib tashlanadi.
            </DialogDescription>
          </DialogHeader>
          <Select value={nextRole} onValueChange={(v) => setNextRole(v as AppRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ADMIN_MANAGED_ROLES.map((r) => (
                <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={mutation.isPending}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => target && mutation.mutate({ userId: target.id, role: nextRole })}
              disabled={mutation.isPending || !target}
            >
              {mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
