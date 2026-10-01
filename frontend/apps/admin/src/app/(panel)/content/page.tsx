"use client";

import { api, ApiError } from "@masari/api";
import { Button, Card, CardHeader, Field, Input, PageHeader, Skeleton, Textarea, toast } from "@masari/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type Content = {
  faqs: { question: string; answer: string }[];
  stats: { label: string; value: number; suffix?: string }[];
  contact: Record<string, string>;
};

const CONTACT_FIELDS = [["phone", "الهاتف"], ["whatsapp", "واتساب"], ["email", "البريد"], ["address", "العنوان"], ["cr_number", "السجل التجاري"], ["vat_number", "الرقم الضريبي"]] as const;

export default function ContentPage() {
  const query = useQuery({ queryKey: ["content"], queryFn: () => api<Content>("admin/content") });

  if (!query.data) return <Skeleton className="h-96" />;

  return <ContentEditor initial={query.data} />;
}

function ContentEditor({ initial }: { initial: Content }) {
  const [content, setContent] = useState<Content>(initial);
  const save = useMutation({ mutationFn: () => api("admin/content", { method: "PUT", body: content }), onSuccess: () => toast.success("تم حفظ محتوى الموقع"), onError: (error: ApiError) => toast.error(error.message) });

  return (
    <>
      <PageHeader title="محتوى الموقع" description="الأرقام والأسئلة الشائعة وبيانات التواصل في الصفحة الرئيسية." actions={<Button onClick={() => save.mutate()} loading={save.isPending}>حفظ التغييرات</Button>} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="الأرقام" action={<Button size="sm" variant="ghost" onClick={() => setContent({ ...content, stats: [...content.stats, { label: "", value: 0, suffix: "" }] })}><Plus />إضافة</Button>} />
          <div className="space-y-3 p-5">
            {content.stats.map((stat, index) => (
              <div key={index} className="grid grid-cols-[1fr_110px_70px_auto] gap-2">
                <Input value={stat.label} onChange={(event) => setContent({ ...content, stats: content.stats.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)) })} aria-label="العنوان" />
                <Input type="number" value={stat.value} onChange={(event) => setContent({ ...content, stats: content.stats.map((item, i) => (i === index ? { ...item, value: Number(event.target.value) } : item)) })} className="num" aria-label="القيمة" />
                <Input value={stat.suffix ?? ""} onChange={(event) => setContent({ ...content, stats: content.stats.map((item, i) => (i === index ? { ...item, suffix: event.target.value } : item)) })} className="num" aria-label="اللاحقة" />
                <Button size="icon" variant="ghost" onClick={() => setContent({ ...content, stats: content.stats.filter((_, i) => i !== index) })} aria-label="حذف"><Trash2 /></Button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="بيانات التواصل" />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {CONTACT_FIELDS.map(([key, label]) => (
              <Field key={key} label={label} htmlFor={`c-${key}`}><Input id={`c-${key}`} value={content.contact[key] ?? ""} onChange={(event) => setContent({ ...content, contact: { ...content.contact, [key]: event.target.value } })} /></Field>
            ))}
          </div>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="الأسئلة الشائعة" action={<Button size="sm" variant="ghost" onClick={() => setContent({ ...content, faqs: [...content.faqs, { question: "", answer: "" }] })}><Plus />إضافة سؤال</Button>} />
          <div className="space-y-4 p-5">
            {content.faqs.map((faq, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-line p-3 md:grid-cols-[1fr_1.6fr_auto]">
                <Input value={faq.question} onChange={(event) => setContent({ ...content, faqs: content.faqs.map((item, i) => (i === index ? { ...item, question: event.target.value } : item)) })} placeholder="السؤال" aria-label="السؤال" />
                <Textarea rows={2} value={faq.answer} onChange={(event) => setContent({ ...content, faqs: content.faqs.map((item, i) => (i === index ? { ...item, answer: event.target.value } : item)) })} placeholder="الإجابة" aria-label="الإجابة" />
                <Button size="icon" variant="ghost" onClick={() => setContent({ ...content, faqs: content.faqs.filter((_, i) => i !== index) })} aria-label="حذف"><Trash2 /></Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
