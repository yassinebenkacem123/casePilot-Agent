import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { IntakeForm } from "@/features/tickets/intake";

export default function Home() {
  return (
    <main className="intake-layout">
      <nav className="public-nav" aria-label="Primary navigation">
        <Link href="/" className="brand-link" aria-label="CasePilot AI Home">
          <BrandLogo variant="dark-surface" size="md" />
        </Link>
        <Link href="/board" className="nav-pill-link">
          Operator workspace
          <ArrowUpRight size={14} />
        </Link>
      </nav>

      <section className="intake-grid">
        <div className="intake-hero">
          <p className="eyebrow">
            <Sparkles size={12} /> INTELLIGENT SUPPORT ORCHESTRATION
          </p>
          <h1>
            Enterprise support,
            <br />
            <span>orchestrated.</span>
          </h1>
          <p className="intro">
            Submit your request below. CasePilot AI structures urgency, routes
            to the right specialists, and prepares a grounded response for human
            review.
          </p>

          <div className="intake-note">
            <span>01</span>
            <div>
              <strong>Persistent intake</strong>
              <p>Saved immediately with a unique tracking reference</p>
            </div>
            <span>02</span>
            <div>
              <strong>AI-assisted triage</strong>
              <p>Intent, priority, and knowledge sources prepared automatically</p>
            </div>
            <span>03</span>
            <div>
              <strong>Human-approved resolution</strong>
              <p>Every recommendation is verified by a support operator</p>
            </div>
          </div>

          <div className="intake-trust">
            <ShieldCheck size={15} />
            <span>
              Please leave passwords, API keys, and payment details out of your
              request.
            </span>
          </div>
        </div>

        <IntakeForm />
      </section>

      <footer>
        <span className="footer-brand">
          <Zap size={12} /> CasePilot AI
        </span>
        <span>AI proposes · Humans approve · Audit records</span>
      </footer>
    </main>
  );
}
