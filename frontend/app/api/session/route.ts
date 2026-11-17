import { timingSafeEqual } from "node:crypto";
import { clearSession, sameOrigin, setSession } from "@/lib/session";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ detail: "Invalid origin" }, { status: 403 });
  const { token } = await request.json();
  const expected = process.env.OPERATOR_TOKEN;
  if (
    !expected ||
    typeof token !== "string" ||
    Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  )
    return Response.json({ detail: "Invalid operator token" }, { status: 401 });
  await setSession();
  return Response.json({ ok: true });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ detail: "Invalid origin" }, { status: 403 });
  await clearSession();
  return Response.json({ ok: true });
}
