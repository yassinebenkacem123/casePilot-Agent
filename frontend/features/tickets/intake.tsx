"use client";
import { useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function IntakeForm({ onSuccess }: { onSuccess?: (trackingId: string) => void } = {}) {
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
      onSuccess?.(result.tracking_id);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (tracking)
    return (
      <section className="form-panel success" role="status">
        <div className="success-icon-wrap">
          <CheckCircle2 size={26} />
        </div>
        <p className="eyebrow">REQUEST PERSISTED</p>
        <h2>Your request is saved.</h2>
        <p className="muted">Keep your tracking reference for follow-up:</p>
        <strong className="tracking">{tracking}</strong>
        <p className="muted">
          CasePilot AI is analyzing your ticket and routing it to the right
          priority queue for human review.
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
      <p className="eyebrow">NEW SUPPORT REQUEST</p>
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
          rows={4}
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
        <ArrowUpRight size={16} />
      </Button>
      <p className="muted small form-footnote">
        <ShieldCheck size={13} />
        <span>
          Saved before AI triage. Every recommendation is reviewed by a person.
        </span>
      </p>
    </form>
  );
}
