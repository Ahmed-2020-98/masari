"use client";

import { api, type City } from "@masari/api";
import { Card, DataTable, Input, PageHeader, Switch } from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";

export default function CitiesPage() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["admin-cities", search], queryFn: () => api<{ data: (City & { is_active?: boolean })[] }>("admin/cities", { query: { search } }) });
  const update = useMutation({ mutationFn: ({ id, body }: { id: number; body: Record<string, boolean> }) => api(`admin/cities/${id}`, { method: "PATCH", body }), onSuccess: () => client.invalidateQueries({ queryKey: ["admin-cities"] }) });

  return (
    <>
      <PageHeader title="المدن والمناطق" description="المدن النائية تُسعَّر بنطاق «مناطق نائية»." />
      <Card>
        <div className="border-b border-line p-4"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن مدينة" startIcon={<Search />} className="max-w-sm" aria-label="بحث" /></div>
        <DataTable
          rows={data?.data}
          loading={isLoading}
          rowKey={(row) => row.id}
          columns={[
            { key: "name", header: "المدينة", cell: (row) => <><p className="font-bold">{row.name}</p><p className="num text-xs text-ink-subtle">{row.name_en}</p></> },
            { key: "region", header: "المنطقة", cell: (row) => row.region },
            { key: "remote", header: "منطقة نائية", cell: (row) => <Switch checked={row.is_remote} onCheckedChange={(checked) => update.mutate({ id: row.id, body: { is_remote: checked } })} aria-label={`نائية ${row.name}`} /> },
          ]}
        />
      </Card>
    </>
  );
}
