import { NextResponse, type NextRequest } from "next/server";
import { backendJson, setToken } from "@/lib/bff";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { response, payload } = await backendJson("auth/register", {
    body: { ...body, device_name: request.headers.get("user-agent")?.slice(0, 100) ?? "browser", platform: "web" },
  });

  if (!response.ok) return NextResponse.json(payload, { status: response.status });

  await setToken(payload.token);
  return NextResponse.json({ user: payload.user }, { status: 201 });
}
