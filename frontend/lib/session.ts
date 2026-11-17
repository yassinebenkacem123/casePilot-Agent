import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
const COOKIE = "casepilot_session";
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32)
    throw new Error("Set SESSION_SECRET to at least 32 random characters");
  return value;
}
function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}
export async function hasSession() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expires, signed] = value.split(".");
  if (!expires || !signed || Number(expires) < Date.now()) return false;
  const expected = signature(expires);
  const actualBuffer = Buffer.from(signed);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
export async function setSession() {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  (await cookies()).set(COOKIE, `${expires}.${signature(expires)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}
export async function clearSession() {
  (await cookies()).delete(COOKIE);
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
