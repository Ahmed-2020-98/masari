"use client";

import { api, ApiError } from "@masari/api";
import { Button, Card, Field, Input, Textarea, toast } from "@masari/ui";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const send = useMutation({
    mutationFn: () => api<{ message: string }>("public/contact", { method: "POST", body: form }),
    onSuccess: (data) => {
      toast.success(data.message);
      setForm({ name: "", phone: "", email: "", subject: "", message: "" });
    },
  });
  const error = send.error instanceof ApiError ? send.error : null;
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value });

  return (
    <Card className="p-6">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); send.mutate(); }}>
        <Field label="الاسم" htmlFor="c-name" required error={error?.field("name")}><Input id="c-name" value={form.name} onChange={set("name")} autoComplete="name" required /></Field>
        <Field label="رقم الجوال" htmlFor="c-phone" required error={error?.field("phone")}><Input id="c-phone" value={form.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" className="num" required /></Field>
        <Field label="البريد الإلكتروني" htmlFor="c-email" className="sm:col-span-2" error={error?.field("email")}><Input id="c-email" type="email" value={form.email} onChange={set("email")} autoComplete="email" /></Field>
        <Field label="الموضوع" htmlFor="c-subject" required className="sm:col-span-2" error={error?.field("subject")}><Input id="c-subject" value={form.subject} onChange={set("subject")} required /></Field>
        <Field label="رسالتك" htmlFor="c-message" required className="sm:col-span-2" error={error?.field("message")}><Textarea id="c-message" rows={5} value={form.message} onChange={set("message")} required /></Field>
        <Button type="submit" size="lg" className="sm:col-span-2" loading={send.isPending}>إرسال الرسالة</Button>
      </form>
    </Card>
  );
}
