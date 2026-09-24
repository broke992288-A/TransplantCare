import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, MailCheck, Search, ShieldCheck, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
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
  ADMIN_MANAGED_ROLES, confirmUserEmail, fetchAdminUsers, primaryRole, resetUserPassword, updateUserRole,
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

  const confirmMutation = useMutation({
    mutationFn: (userId: string) => confirmUserEmail(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Email tasdiqlandi", description: "Foydalanuvchi emaili tasdiqlangan deb belgilandi." });
      setConfirmTarget(null);
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Xatolik", description: getErrorMessage(err) });
    },
  });

  const [pwTarget, setPwTarget] = useState<AdminUserRow | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwVisible, setPwVisible] = useState(false);
  const [pw2Visible, setPw2Visible] = useState(false);
  const pwError =
    pw.length === 0 ? null
    : pw.length < 8 ? "Parol kamida 8 belgidan iborat bo'lishi kerak."
    : pw.length > 200 ? "Parol juda uzun."
    : pw2.length > 0 && pw !== pw2 ? "Parollar mos kelmadi."
    : null;
  const pwValid = pw.length >= 8 && pw.length <= 200 && pw === pw2;
  const closePw = () => { setPwTarget(null); setPw(""); setPw2(""); setPwVisible(false); setPw2Visible(false); };

  const pwMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) => resetUserPassword(userId, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Parol yangilandi", description: "Foydalanuvchi yangi parol bilan kira oladi." });
      closePw();
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Xatolik", description: getErrorMessage(err) });
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
                        <TableCell className="max-w-[260px] break-words text-muted-foreground">{u.email ?? "—"}</TableCell>
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
                          <div className="flex flex-wrap justify-end gap-2">
                            {!u.email_confirmed && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="gap-1"
                                onClick={() => setConfirmTarget(u)}
                              >
                                <MailCheck className="h-4 w-4" />
                                Emailni tasdiqlash
                              </Button>
                            )}
                            {!isSelf && (
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => setPwTarget(u)}>
                                <KeyRound className="h-4 w-4" />
                                Parolni tiklash
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSelf}
                              title={isSelf ? "O'z rolingizni o'zgartirish mumkin emas" : undefined}
                              onClick={() => openDialog(u)}
                            >
                              Rolni o'zgartirish
                            </Button>
                          </div>
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

      <Dialog open={confirmTarget !== null} onOpenChange={(open) => { if (!open) setConfirmTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Emailni tasdiqlash</DialogTitle>
            <DialogDescription>
              <span className="block font-medium text-foreground">
                {confirmTarget?.email ?? confirmTarget?.full_name ?? ""}
              </span>
              <span className="mt-2 block">
                Bu emailni administrator sifatida tasdiqlaysizmi? Foydalanuvchi email tasdiqlashsiz tizimga kira oladi.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmTarget(null)}
              disabled={confirmMutation.isPending}
            >
              Bekor qilish
            </Button>
            <Button
              onClick={() => confirmTarget && confirmMutation.mutate(confirmTarget.id)}
              disabled={confirmMutation.isPending || !confirmTarget}
            >
              {confirmMutation.isPending ? "Tasdiqlanmoqda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={pwTarget !== null} onOpenChange={(open) => { if (!open) closePw(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Parolni tiklash</DialogTitle>
            <DialogDescription>
              {pwTarget?.email ?? pwTarget?.full_name ?? ""} uchun yangi parol kiriting.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              if (pwTarget && pwValid) pwMutation.mutate({ userId: pwTarget.id, password: pw });
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="new-pw">Yangi parol</Label>
              <div className="relative">
                <Input id="new-pw" type={pwVisible ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="pr-10" />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={pwVisible ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  onClick={() => setPwVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {pwVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-pw2">Parolni tasdiqlang</Label>
              <div className="relative">
                <Input id="new-pw2" type={pw2Visible ? "text" : "password"} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="pr-10" />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={pw2Visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  onClick={() => setPw2Visible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {pw2Visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closePw} disabled={pwMutation.isPending}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={!pwValid || pwMutation.isPending}>
                {pwMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
