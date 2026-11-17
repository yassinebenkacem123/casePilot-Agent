"use client";
import { useRef, useState } from "react";
import { CheckCircle2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
export function IntakeForm() {
  const key = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [tracking, setTracking] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    key.current ??= crypto.randomUUID();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ tracking_id: string }>("requests", {
        method: "POST",
        headers: { "Idempotency-Key": key.current },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      setTracking(result.tracking_id);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
    }
  }
  if (tracking)
    return (
      <section className="form-panel success" role="status">
        <CheckCircle2 size={40} />
        <h2>Your request is saved.</h2>
        <p>Keep your tracking reference:</p>
        <strong className="tracking">{tracking}</strong>
        <p>
          Our support team will review your request. No response has been sent
          automatically.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            key.current = null;
            setTracking("");
          }}
        >
          Submit another request
        </Button>
      </section>
    );
  return (
    <form className="form-panel" onSubmit={submit}>
      <p className="eyebrow">NEW REQUEST</p>
      <h2>How can we help?</h2>
      <div className="form-row">
        <label>
          Your name
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            placeholder="Alex Morgan"
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="alex@company.com"
          />
        </label>
      </div>
      <label>
        Subject
        <input
          name="subject"
          required
          minLength={3}
          maxLength={180}
          placeholder="A short description of the issue"
        />
      </label>
      <label>
        What’s happening?
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={10000}
          rows={6}
          placeholder="Include what you expected, what happened, and any steps you’ve tried."
        />
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Button disabled={pending} type="submit">
        {pending ? "Saving request…" : "Send request"}
        <ArrowUpRight size={17} />
      </Button>
      <p className="muted small">
        Your request is saved before AI analysis. Every recommendation is
        reviewed by a person.
      </p>
    </form>
  );
}
