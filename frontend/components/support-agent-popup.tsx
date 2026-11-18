"use client";
import { useState } from "react";
import { MessageSquarePlus, Sparkles, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { IntakeForm } from "@/features/tickets/intake";

export function SupportAgentPopup({
  open: controlledOpen,
  onOpenChange,
  onSubmitted,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmitted?: (trackingId: string) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <div className="agent-popup-root">
      {isOpen && (
        <section
          className="agent-popup-card"
          aria-label="CasePilot AI Support Agent"
          role="dialog"
          aria-modal="false"
        >
          <header className="agent-popup-header">
            <div className="agent-popup-title">
              <BrandLogo variant="light-surface" size="sm" />
              <span className="agent-popup-badge">
                <Sparkles size={11} />
                Live Triage Agent
              </span>
            </div>
            <button
              type="button"
              className="agent-popup-close"
              aria-label="Close support agent"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </header>
          <div className="agent-popup-body">
            <IntakeForm onSuccess={onSubmitted} />
          </div>
        </section>
      )}

      <button
        type="button"
        className="agent-fab"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close CasePilot Agent" : "Open CasePilot Agent"}
        onClick={() => setOpen(!isOpen)}
      >
        {isOpen ? <X size={18} /> : <MessageSquarePlus size={18} />}
        <span>{isOpen ? "Close Agent" : "Ask CasePilot AI"}</span>
      </button>
    </div>
  );
}

