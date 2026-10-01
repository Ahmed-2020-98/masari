import type { NextRequest } from "next/server";
import { forward } from "@/lib/bff";

type Context = { params: Promise<{ path: string[] }> };

const handler = async (request: NextRequest, { params }: Context) => forward(request, (await params).path);

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
