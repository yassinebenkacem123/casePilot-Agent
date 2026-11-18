"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <main className="login-layout">
      <div className="login-brand">
        <Link className="brand-link" href="/" aria-label="CasePilot AI Home">
          <BrandLogo variant="light-surface" size="lg" />
        </Link>
      </div>
      <form
        className="form-panel"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          const token = new FormData(event.currentTarget).get("token");
          try {
            const response = await fetch("/api/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
            if (!response.ok) throw new Error("Invalid operator token");
            router.replace("/board");
            router.refresh();
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setPending(false);
          }
        }}
      >
        <p className="eyebrow">
          <Lock size={12} /> OPERATOR ACCESS
        </p>
        <h1>Welcome back.</h1>
        <p className="muted">
          Use the operator token configured by your workspace administrator to
          enter the command center.
        </p>
        <label>
          Operator token
          <input
            type="password"
            name="token"
            autoComplete="current-password"
            placeholder="Enter operator token"
            required
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button disabled={pending} type="submit">
          {pending ? "Signing in…" : "Open workspace"}
          <ArrowRight size={15} />
        </Button>
      </form>
    </main>
  );
}
