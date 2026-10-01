import { NextResponse, type NextRequest } from "next/server";
import { backendJson, PLATFORM, setToken } from "@/lib/bff";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { response, payload } = await backendJson("auth/login", {
    body: { phone: body.phone, password: body.password, device_name: request.headers.get("user-agent")?.slice(0, 100) ?? "browser", platform: PLATFORM },
  });

  if (!response.ok) return NextResponse.json(payload, { status: response.status });

  await setToken(payload.token);
  return NextResponse.json({ user: payload.user });
}
