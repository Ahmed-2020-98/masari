import { NextResponse } from "next/server";
import { backendJson, clearToken, getToken } from "@/lib/bff";

export async function POST() {
  const token = await getToken();
  if (token) await backendJson("auth/logout", { token }).catch(() => null);
  await clearToken();

  return NextResponse.json({ ok: true });
}
