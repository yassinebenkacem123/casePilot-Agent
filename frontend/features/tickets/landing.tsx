"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SupportAgentPopup } from "@/components/support-agent-popup";
import { Button } from "@/components/ui/button";

const steps = [
  {
    num: "01",
    tag: "PERSISTENT INTAKE",
    title: "Zero lost tickets",
    desc: "Every customer request is persisted immediately with an idempotent tracking ID before AI execution begins.",
  },
  {
    num: "02",
    tag: "LANGGRAPH TRIAGE",
    title: "Autonomous classification",
    desc: "Typed tools classify intent, evaluate urgency, and auto-route into Low, Medium, or High priority columns.",
  },
  {
    num: "03",
    tag: "RAG GROUNDING",
    title: "Cited draft responses",
    desc: "Knowledge retrieval attaches verified policy snippets and versioned citations—never fabricated promises.",
  },
  {
    num: "04",
    tag: "HUMAN AUTHORITY",
    title: "Confirm or override",
    desc: "Operators confirm AI proposals or override priority & team with field locks before Salesforce Service Cloud sync.",
  },
];

export function LandingPage() {
  const [agentOpen, setAgentOpen] = useState(false);

  return (
    <div className="landing-shell">
      <header className="landing-nav-wrap">
        <nav className="landing-nav" aria-label="Primary navigation">
          <Link href="/" className="brand-link" aria-label="CasePilot AI Home">
            <BrandLogo variant="light-surface" size="md" />
          </Link>
          <div className="landing-nav-links">
            <a href="#workflow">Workflow</a>
            <a href="#orchestration">Orchestration</a>
            <a href="#governance">Governance</a>
          </div>
          <div className="landing-nav-actions">
            <Link href="/board" className="nav-pill-link">
              Operator workspace
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </nav>
      </header>

      <main className="landing-main">
        {/* Hero Card (Figma-inspired rounded editorial container) */}
        <section className="hero-card" aria-label="Hero">
          <div className="hero-badge">
            <Sparkles size={13} />
            <span>INTELLIGENT CUSTOMER SUPPORT ORCHESTRATION</span>
          </div>
          <h1>
            Support triage,
            <br />
            <span>piloted by AI.</span>
          </h1>
          <p className="hero-sub">
            CasePilot AI pairs a LangGraph triage agent with human-in-the-loop
            priority confirmation and Salesforce Service Cloud sync—built for
            high-velocity enterprise support teams.
          </p>

          <div className="hero-actions">
            <Button onClick={() => setAgentOpen(true)}>
              Launch Support Agent
              <ArrowUpRight size={16} />
            </Button>
            <Link href="/board" className="button outline">
              Open Kanban Dashboard
            </Link>
          </div>

          <div className="hero-metrics-bar">
            <div>
              <strong>Low · Med · High</strong>
              <span>Auto-triaged priority columns</span>
            </div>
            <div>
              <strong>LangGraph + RAG</strong>
              <span>Grounded, cited reply drafts</span>
            </div>
            <div>
              <strong>100% Auditable</strong>
              <span>Confirm or override every action</span>
            </div>
          </div>
        </section>

        {/* Numbered 01-04 Bento Grid (inspired by Figma oversized index cards) */}
        <section id="workflow" className="bento-section">
          <div className="section-intro">
            <p className="eyebrow">HOW IT WORKS</p>
            <h2>Four stages from intake to Salesforce sync.</h2>
          </div>
          <div className="bento-grid">
            {steps.map((s) => (
              <article key={s.num} className="bento-card">
                <span className="bento-num" aria-hidden="true">
                  {s.num}
                </span>
                <p className="bento-tag">{s.tag}</p>
                <h3>{s.title}</h3>
                <p className="muted">{s.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 3-Column Pillars (1 featured #FF3419 brand card + 2 crisp white cards) */}
        <section id="orchestration" className="pillars-section">
          <div className="section-intro">
            <p className="eyebrow">ENTERPRISE ARCHITECTURE</p>
            <h2>Built for speed, designed for human trust.</h2>
          </div>
          <div className="pillars-grid">
            <article className="pillar-card pillar-featured">
              <div className="pillar-icon">
                <Bot size={20} />
              </div>
              <h3>Agentic Priority Triage</h3>
              <p>
                Requests submitted via the pop-up agent are automatically
                classified and placed into Low, Medium, or High columns with
                transparent rationale.
              </p>
              <ul>
                <li>
                  <CheckCircle2 size={14} /> Structured LLM classification
                </li>
                <li>
                  <CheckCircle2 size={14} /> Calibrated confidence scoring
                </li>
                <li>
                  <CheckCircle2 size={14} /> Instant operator confirmation
                </li>
              </ul>
            </article>

            <article className="pillar-card">
              <div className="pillar-icon">
                <Layers size={20} />
              </div>
              <h3>Priority-First Kanban</h3>
              <p>
                Drag cards across Low, Medium, and High columns or click any
                ticket to confirm the AI recommendation or override it with
                field locks.
              </p>
              <ul>
                <li>
                  <CheckCircle2 size={14} /> Keyboard &amp; pointer DnD
                </li>
                <li>
                  <CheckCircle2 size={14} /> Human-locked field protection
                </li>
                <li>
                  <CheckCircle2 size={14} /> Full audit timeline
                </li>
              </ul>
            </article>

            <article id="governance" className="pillar-card">
              <div className="pillar-icon">
                <ShieldCheck size={20} />
              </div>
              <h3>Salesforce Governance</h3>
              <p>
                AI never writes externally without approval. Sync approved case
                snapshots to Salesforce Service Cloud with idempotent outbox
                retries.
              </p>
              <ul>
                <li>
                  <CheckCircle2 size={14} /> Version-checked approvals
                </li>
                <li>
                  <CheckCircle2 size={14} /> Explicit Demo vs Live banner
                </li>
                <li>
                  <CheckCircle2 size={14} /> Zero ungrounded policy claims
                </li>
              </ul>
            </article>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="footer-brand">
          <Zap size={13} /> CasePilot AI
        </span>
        <span>AI proposes · Humans approve · Audit records</span>
      </footer>

      <SupportAgentPopup open={agentOpen} onOpenChange={setAgentOpen} />
    </div>
  );
}

