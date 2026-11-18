"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  Gauge,
  GitBranch,
  Kanban,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SupportAgentPopup } from "@/components/support-agent-popup";
import { Button } from "@/components/ui/button";
import { IntakeForm } from "@/features/tickets/intake";

const faqs = [
  {
    q: "How does CasePilot AI triage incoming support requests?",
    a: "Every submission is persisted immediately, then a LangGraph agent invokes typed tools to classify intent, score severity into Low, Medium, or High, retrieve grounded knowledge, and prepare a draft reply for human review.",
  },
  {
    q: "Can AI overwrite human decisions or send replies automatically?",
    a: "No. CasePilot AI enforces human-in-the-loop governance. AI writes proposals only, operators can confirm or override priority and team with field locks, and customer replies are never auto-sent.",
  },
  {
    q: "How does RAG prevent fabricated policies or SLA promises?",
    a: "The knowledge retrieval tool attaches verified document IDs, version numbers, and exact snippets. If evidence is missing, the agent abstains rather than inventing refund or SLA terms.",
  },
  {
    q: "How does the Salesforce Service Cloud integration work?",
    a: "Approved ticket snapshots are queued in a transactional outbox and synced idempotently to Salesforce Case objects via server-side OAuth. Demo mode clearly labels unsynced actions.",
  },
  {
    q: "How do the Low, Medium, and High Kanban columns work?",
    a: "Newly analyzed tickets are automatically placed in Low, Medium, or High based on the agent's triage proposal. Operators can drag cards across columns or click any ticket to confirm or change.",
  },
];

export function LandingPage() {
  const [agentOpen, setAgentOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number>(0);

  return (
    <div className="landing-shell">
      <div className="hero-ambient" aria-hidden="true" />

      {/* Top Navigation (Figma #1:46, #1:69, #1:128) */}
      <header className="landing-nav-wrap">
        <nav className="landing-nav" aria-label="Primary navigation">
          <Link href="/" className="brand-link" aria-label="CasePilot AI Home">
            <BrandLogo variant="light-surface" size="header" />
          </Link>

          <div className="landing-nav-pill">
            <a href="#platform">Platform</a>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#capabilities">AI Capabilities</a>
            <Link href="/board">Dashboard</Link>
            <a href="#contact">Contact</a>
          </div>

          <div className="landing-nav-actions">
            <Link href="/login" className="nav-signin">
              Sign In
            </Link>
            <Button size="sm" onClick={() => setAgentOpen(true)}>
              Get Started
            </Button>
          </div>
        </nav>
      </header>

      <main className="landing-main">
        {/* Hero (Figma #1:123..#1:127) */}
        <section id="platform" className="figma-hero" aria-label="Hero">
          <h1>
            Customer Support.
            <br />
            <span>Reimagined with AI.</span>
          </h1>
          <p className="hero-sub">
            Transform customer requests into intelligent workflows.
            Automatically analyze, prioritize, and route support tickets with
            agentic AI — while keeping humans in control.
          </p>
          <div className="hero-actions">
            <Button onClick={() => setAgentOpen(true)}>
              Explore Platform
              <ArrowUpRight size={16} />
            </Button>
            <Link href="/board" className="button outline">
              View Dashboard
            </Link>
          </div>
        </section>

        {/* Asymmetric 4-Column Bento Grid (Figma "What We do" #1:68, #1:115..#1:286) */}
        <section id="features" className="figma-section">
          <h2 className="section-title">What CasePilot Does</h2>

          <div className="figma-bento">
            <article className="bento-tile">
              <div className="bento-icon">
                <Bot size={20} />
              </div>
              <h3>Intelligent Classification</h3>
              <p>
                LangGraph structured output classifies customer intent across
                outages, billing, account access, and general inquiries.
              </p>
            </article>

            <article className="bento-tile">
              <div className="bento-icon">
                <Gauge size={20} />
              </div>
              <h3>Priority Triage</h3>
              <p>
                Policy-backed severity scoring automatically sorts incoming
                requests into Low, Medium, and High priority queues.
              </p>
            </article>

            <article className="bento-tile">
              <div className="bento-icon">
                <GitBranch size={20} />
              </div>
              <h3>Agentic Team Routing</h3>
              <p>
                Allowlisted specialist routing recommends the right team with
                calibrated confidence and clear human-readable rationale.
              </p>
            </article>

            {/* Tall right column card spanning 2 rows (Figma #1:264) */}
            <article className="bento-tile bento-tall">
              <div className="bento-icon">
                <Kanban size={20} />
              </div>
              <h3>Interactive Priority Kanban</h3>
              <p>
                Real-time Low, Medium, and High columns powered by dnd-kit with
                instant confirm or override controls.
              </p>
              <div className="mini-kanban" aria-hidden="true">
                <div className="mini-col">
                  <span>High</span>
                  <div className="mini-card mini-card-high">
                    <strong>CP-8412</strong>
                    <small>Checkout API down</small>
                  </div>
                </div>
                <div className="mini-col">
                  <span>Medium</span>
                  <div className="mini-card">
                    <strong>CP-8410</strong>
                    <small>Invoice discrepancy</small>
                  </div>
                </div>
                <div className="mini-col">
                  <span>Low</span>
                  <div className="mini-card">
                    <strong>CP-8407</strong>
                    <small>Onboarding guide</small>
                  </div>
                </div>
              </div>
            </article>

            {/* Wide bottom-left card spanning 2 columns (Figma #1:281) */}
            <article className="bento-tile bento-wide">
              <div className="bento-wide-copy">
                <div className="bento-icon">
                  <BookOpen size={20} />
                </div>
                <h3>RAG-Grounded Reply Drafts</h3>
                <p>
                  Retrieves versioned knowledge chunks with provenance citations
                  so operators review grounded responses instead of hallucinations.
                </p>
              </div>
              <div className="bento-wide-accent" aria-hidden="true">
                <Sparkles size={28} />
                <span>97% Grounded</span>
                <small>Verified citations</small>
              </div>
            </article>

            <article className="bento-tile">
              <div className="bento-icon">
                <CloudUpload size={20} />
              </div>
              <h3>Salesforce Case Sync</h3>
              <p>
                Approved ticket snapshots sync idempotently to Salesforce
                Service Cloud with full outbox auditability.
              </p>
            </article>
          </div>
        </section>

        {/* Product Showcase + Trust Strip (Figma "Check our Work" #1:70, #1:131, #1:199) */}
        <section id="how-it-works" className="figma-section figma-centered">
          <h2 className="section-title">Orchestration in Action</h2>
          <p className="section-sub">
            From customer submission to human-approved Salesforce Case sync —
            every step is transparent, auditable, and fast.
          </p>

          <div className="showcase-grid">
            <article className="showcase-card">
              <div className="showcase-frame">
                <div className="showcase-tag">01 · Priority Board</div>
                <div className="showcase-mock">
                  <div className="mock-pill mock-high">HIGH · 97% AI</div>
                  <strong>Production API latency spike</strong>
                  <span>Technical Ops · Awaiting confirmation</span>
                </div>
              </div>
            </article>

            <article className="showcase-card">
              <div className="showcase-frame">
                <div className="showcase-tag">02 · Confirm or Change</div>
                <div className="showcase-mock">
                  <div className="mock-pill mock-accent">Human Authority</div>
                  <strong>Confirm AI triage or lock fields</strong>
                  <span>Priority · Team · Status · Intent</span>
                </div>
              </div>
            </article>

            <article className="showcase-card">
              <div className="showcase-frame">
                <div className="showcase-tag">03 · RAG &amp; Audit</div>
                <div className="showcase-mock">
                  <div className="mock-pill mock-success">Cited Draft</div>
                  <strong>support-faq.md · v2</strong>
                  <span>Full actor &amp; run_id audit timeline</span>
                </div>
              </div>
            </article>
          </div>

          <div className="trust-pill">
            <ShieldCheck size={16} className="accent-icon" />
            <span>
              <strong>Human-in-the-Loop</strong> · 100% Auditable · Zero
              Unapproved External Writes
            </span>
          </div>
        </section>

        {/* Split Capabilities Section (Figma "Pricing / Unlimited Services" #1:142..#1:181) */}
        <section id="capabilities" className="figma-split">
          <div className="split-left">
            <h2 className="section-title">AI Capabilities</h2>
            <p className="muted">
              Enterprise-grade agentic orchestration without sacrificing
              operational control or compliance.
            </p>
            <div className="split-cta-card">
              <h3>Launch the Live Support Agent</h3>
              <p className="muted small">
                Submit a real ticket and watch LangGraph classify, prioritize,
                and route it onto the Kanban board.
              </p>
              <Button onClick={() => setAgentOpen(true)}>
                Submit Test Ticket
                <ArrowUpRight size={15} />
              </Button>
            </div>
          </div>

          <div className="split-right-card">
            <div className="split-right-body">
              <h3>Full-Stack Orchestration</h3>
              <p className="muted">
                Every primitive required to run AI-assisted customer support in
                production.
              </p>
              <div className="checklist-grid">
                <span>
                  <CheckCircle2 size={15} /> Idempotent intake
                </span>
                <span>
                  <CheckCircle2 size={15} /> LangGraph state machine
                </span>
                <span>
                  <CheckCircle2 size={15} /> Low / Med / High Kanban
                </span>
                <span>
                  <CheckCircle2 size={15} /> Human-locked fields
                </span>
                <span>
                  <CheckCircle2 size={15} /> RAG citation provenance
                </span>
                <span>
                  <CheckCircle2 size={15} /> Salesforce Case outbox
                </span>
              </div>
            </div>
            <div className="split-right-footer">
              <div>
                <strong>100%</strong>
                <span>Human-approved external actions</span>
              </div>
              <Link href="/board" className="button outline">
                Open Workspace
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Accordion (Figma #1:66..#1:109) */}
        <section className="figma-faq">
          <div className="faq-left">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="muted">
              Everything you need to know about CasePilot AI’s agentic triage
              and governance model.
            </p>
          </div>
          <div className="faq-list">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className={`faq-item ${isOpen ? "is-open" : ""}`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  >
                    <span>{item.q}</span>
                    <ChevronDown size={18} className="faq-chevron" />
                  </button>
                  {isOpen && <p className="faq-answer">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact / Customer Ticket Submission (Figma "Let's Get in Touch" #1:67..#1:113) */}
        <section id="contact" className="figma-contact">
          <div className="figma-centered">
            <h2 className="section-title">Submit a Support Request</h2>
            <p className="section-sub">
              Need help right now? Send your request below — our LangGraph agent
              triages it immediately for operator review.
            </p>
          </div>
          <div className="contact-form-wrap">
            <IntakeForm />
          </div>
        </section>

        {/* Rounded Footer Card (Figma #1:205..#1:241) */}
        <footer className="figma-footer-card">
          <div className="footer-top">
            <div className="footer-brand-col">
              <BrandLogo variant="light-surface" size="md" />
              <p className="muted">
                Intelligent customer support orchestration powered by LangGraph,
                RAG, and Salesforce Service Cloud.
              </p>
            </div>
            <div className="footer-links">
              <a href="#platform">Platform</a>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <Link href="/board">Dashboard</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-brand">
              <Zap size={13} /> CasePilot AI
            </span>
            <span>AI proposes · Humans approve · Audit records</span>
          </div>
        </footer>
      </main>

      <SupportAgentPopup open={agentOpen} onOpenChange={setAgentOpen} />
    </div>
  );
}
