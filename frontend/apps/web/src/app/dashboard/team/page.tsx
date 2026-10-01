"use client";

import { api, ApiError, type Enum } from "@masari/api";
import { formatPhone, formatRelative } from "@masari/i18n";
import { Badge, Button, Card, CardHeader, Dialog, DialogContent, DialogFooter, EnumBadge, Field, Input, NativeSelect, PageHeader, Skeleton, toast } from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailPlus, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Team = {
  members: { id: number; name: string; phone: string; email: string | null; role: Enum; is_me: boolean; last_login_at: string | null }[];
  invitations: { id: number; name: string; phone: string; role: Enum; expires_at: string }[];
  roles: (Enum & { abilities: string[] })[];
};

const ABILITY_LABELS: Record<string, string> = { shipments: "الشحنات", orders: "الطلبات", addresses: "العناوين", pickups: "الاستلام", wallet: "المحفظة", cod: "التحصيل", integrations: "الربط", tickets: "الدعم", team: "الفريق", invoices: "الفواتير" };

export default function TeamPage() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", role: "operator" });
  const [removing, setRemoving] = useState<Team["members"][number] | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["team"], queryFn: () => api<Team>("merchant/team") });
  const refresh = () => client.invalidateQueries({ queryKey: ["team"] });

  const invite = useMutation({
    mutationFn: () => api<{ message: string }>("merchant/team/invitations", { method: "POST", body: form }),
    onSuccess: (result) => { toast.success(result.message); setOpen(false); setForm({ name: "", phone: "", role: "operator" }); refresh(); },
  });
  const changeRole = useMutation({ mutationFn: ({ id, role }: { id: number; role: string }) => api(`merchant/team/${id}`, { method: "PATCH", body: { role } }), onSuccess: () => { toast.success("تم تحديث الصلاحية"); refresh(); }, onError: (error: ApiError) => toast.error(error.message) });
  const remove = useMutation({ mutationFn: (id: number) => api(`merchant/team/${id}`, { method: "DELETE" }), onSuccess: () => { setRemoving(null); refresh(); } });
  const cancelInvite = useMutation({ mutationFn: (id: number) => api(`merchant/team/invitations/${id}`, { method: "DELETE" }), onSuccess: refresh });
  const error = invite.error instanceof ApiError ? invite.error : null;

  return (
    <>
      <PageHeader title="فريق العمل" description="أضف موظفيك وحدد صلاحيات كل منهم." actions={<Button onClick={() => setOpen(true)}><UserPlus />دعوة عضو</Button>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="الأعضاء" />
          {isLoading ? <div className="space-y-2 p-5"><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : (
            <ul className="divide-y divide-line">
              {data?.members.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="grid size-10 place-items-center rounded-full bg-navy-900 font-bold text-white">{member.name.charAt(0)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{member.name} {member.is_me && <Badge tone="gray">أنت</Badge>}</p>
                    <p className="num text-sm text-ink-subtle" dir="ltr" style={{ textAlign: "right" }}>{formatPhone(member.phone)}</p>
                  </div>
                  <p className="hidden text-xs text-ink-subtle md:block">{member.last_login_at ? `آخر دخول ${formatRelative(member.last_login_at)}` : "لم يسجل الدخول"}</p>
                  {member.role.value === "owner" || member.is_me ? <EnumBadge value={member.role} /> : (
                    <>
                      <div className="w-36">
                        <label htmlFor={`role-${member.id}`} className="sr-only">الصلاحية</label>
                        <NativeSelect id={`role-${member.id}`} value={member.role.value} onChange={(event) => changeRole.mutate({ id: member.id, role: event.target.value })} className="h-9">
                          {data.roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </NativeSelect>
                      </div>
                      <Button size="icon-sm" variant="ghost" onClick={() => setRemoving(member)} aria-label={`حذف ${member.name}`}><Trash2 /></Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!!data?.invitations.length && (
            <>
              <p className="border-t border-line bg-surface-muted px-5 py-2 text-xs font-bold text-ink-subtle">دعوات معلقة</p>
              <ul className="divide-y divide-line">
                {data.invitations.map((invitation) => (
                  <li key={invitation.id} className="flex items-center gap-3 px-5 py-3">
                    <MailPlus className="size-5 text-ink-subtle" aria-hidden />
                    <div className="flex-1"><p className="font-medium">{invitation.name}</p><p className="num text-xs text-ink-subtle">{formatPhone(invitation.phone)}</p></div>
                    <EnumBadge value={invitation.role} />
                    <Button size="sm" variant="ghost" onClick={() => cancelInvite.mutate(invitation.id)}>إلغاء</Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
        <Card>
          <CardHeader title="الصلاحيات" />
          <ul className="space-y-4 p-5">
            {data?.roles.map((role) => (
              <li key={role.value}>
                <EnumBadge value={role} />
                <p className="mt-1.5 flex flex-wrap gap-1">{role.abilities.map((ability) => <span key={ability} className="rounded bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">{ABILITY_LABELS[ability] ?? ability}</span>)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="دعوة عضو جديد" description="ستصله رسالة نصية برابط الانضمام.">
          <div className="space-y-4">
            <Field label="الاسم" htmlFor="i-name" required error={error?.field("name")}><Input id="i-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="رقم الجوال" htmlFor="i-phone" required error={error?.field("phone") ?? (error && !Object.keys(error.errors).length ? error.message : undefined)}><Input id="i-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} dir="ltr" className="num text-end" inputMode="tel" /></Field>
            <Field label="الصلاحية" htmlFor="i-role"><NativeSelect id="i-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{data?.roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</NativeSelect></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => invite.mutate()} loading={invite.isPending}>إرسال الدعوة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!removing} onOpenChange={(value) => !value && setRemoving(null)} title={`حذف ${removing?.name} من الفريق؟`} description="سيتم تسجيل خروجه من جميع الأجهزة." confirmLabel="حذف" loading={remove.isPending} onConfirm={() => removing && remove.mutate(removing.id)} />
    </>
  );
}
