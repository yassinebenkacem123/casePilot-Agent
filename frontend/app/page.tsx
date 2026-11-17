import Link from "next/link";
import { IntakeForm } from "@/features/tickets/intake";
export default function Home() {
  return (
    <main className="intake-layout">
      <nav className="public-nav">
        <Link href="/" className="brand">
          ◈ CasePilot <span>AI</span>
        </Link>
        <Link href="/board">Operator workspace ↗</Link>
      </nav>
      <section className="intake-grid">
        <div>
          <p className="eyebrow">WE’RE HERE TO HELP</p>
          <h1>
            Good support
            <br />
            starts here.
          </h1>
          <p className="intro">
            Tell us what’s happening. Our team will review your request and help
            you find the next step.
          </p>
          <div className="intake-note">
            <span>01</span>
            <p>Share your request</p>
            <span>02</span>
            <p>Get a tracking reference</p>
            <span>03</span>
            <p>A person reviews your case</p>
          </div>
          <p className="muted">
            Please leave passwords and payment details out of your request.
          </p>
        </div>
        <IntakeForm />
      </section>
      <footer>
        CasePilot AI <span>Thoughtful support. Human decisions.</span>
      </footer>
    </main>
  );
}
