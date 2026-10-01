"use client";

import { api, ApiError, type User } from "@masari/api";
import { formatPhone, formatRelative } from "@masari/i18n";
import { Button, Card, DataTable, Dialog, DialogContent, DialogFooter, Field, Input, NativeSelect, PageHeader, Switch, toast } from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

const ROLE_LABELS: Record<string, string> = { super_admin: "مدير عام", operations: "العمليات", finance: "المالية", support: "الدعم الفني" };

export default function AdminsPage() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", role: "support" });
  const { data, isLoading } = useQuery({ queryKey: ["admins"], queryFn: () => api<{ data: User[]; roles: { name: string; permissions: string[] }[] }>("admin/admins") });
  const refresh = () => client.invalidateQueries({ queryKey: ["admins"] });
  const create = useMutation({ mutationFn: () => api("admin/admins", { method: "POST", body: { ...form, email: form.email || null } }), onSuccess: () => { toast.success("تمت إضافة المشرف"); setOpen(false); refresh(); } });
  const update = useMutation({ mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => api(`admin/admins/${id}`, { method: "PATCH", body }), onSuccess: refresh, onError: (error: ApiError) => toast.error(error.message) });
  const error = create.error instanceof ApiError ? create.error : null;

  return (
    <>
      <PageHeader title="المشرفون" description="حسابات فريق مساري وصلاحياتهم." actions={<Button onClick={() => setOpen(true)}><Plus />إضافة مشرف</Button>} />
      <Card>
        <DataTable
          rows={data?.data}
          loading={isLoading}
          rowKey={(row) => row.id}
          columns={[
            { key: "name", header: "الاسم", cell: (row) => <><p className="font-bold">{row.name}</p><p className="num text-xs text-ink-subtle">{formatPhone(row.phone)}</p></> },
            { key: "role", header: "الدور", cell: (row) => <NativeSelect value={row.roles?.[0] ?? ""} onChange={(event) => update.mutate({ id: row.id, body: { role: event.target.value } })} className="h-9 w-40" aria-label="الدور">{data?.roles.map((role) => <option key={role.name} value={role.name}>{ROLE_LABELS[role.name] ?? role.name}</option>)}</NativeSelect> },
            { key: "login", header: "آخر دخول", cell: (row) => <span className="text-xs text-ink-subtle">{formatRelative(row.last_login_at)}</span> },
            { key: "active", header: "نشط", cell: (row) => <Switch checked={row.is_active} onCheckedChange={(checked) => update.mutate({ id: row.id, body: { is_active: checked } })} aria-label="نشط" /> },
          ]}
        />
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="إضافة مشرف">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الاسم" htmlFor="a-name" error={error?.field("name")}><Input id="a-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="الجوال" htmlFor="a-phone" error={error?.field("phone")}><Input id="a-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} dir="ltr" className="num text-end" /></Field>
            <Field label="البريد" htmlFor="a-email" error={error?.field("email")}><Input id="a-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="الدور" htmlFor="a-role"><NativeSelect id="a-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{data?.roles.map((role) => <option key={role.name} value={role.name}>{ROLE_LABELS[role.name] ?? role.name}</option>)}</NativeSelect></Field>
            <Field label="كلمة المرور المؤقتة" htmlFor="a-pass" error={error?.field("password")} hint="10 أحرف على الأقل" className="sm:col-span-2"><Input id="a-pass" type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => create.mutate()} loading={create.isPending}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
