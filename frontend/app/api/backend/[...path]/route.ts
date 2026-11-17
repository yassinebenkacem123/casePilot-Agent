import { hasSession, sameOrigin } from "@/lib/session";
async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const publicIntake =
    request.method === "POST" && path.join("/") === "requests";
  if (!publicIntake && !(await hasSession()))
    return Response.json({ detail: "Login required" }, { status: 401 });
  if (request.method !== "GET" && !sameOrigin(request))
    return Response.json({ detail: "Invalid origin" }, { status: 403 });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!publicIntake)
    headers.Authorization = `Bearer ${process.env.OPERATOR_TOKEN}`;
  const key = request.headers.get("Idempotency-Key");
  if (key) headers["Idempotency-Key"] = key;
  try {
    const target = `${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/api/v1/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        detail:
          "Support service unavailable. Please retry; keep the same submission open.",
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH };
