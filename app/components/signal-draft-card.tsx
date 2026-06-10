"use client";

import { Check, ExternalLink, Loader2, Send } from "lucide-react";

export type DraftableSignal = {
  id: string;
  title: string;
  text: string;
  author: string;
  url: string;
  sourceLabel: string;
  intentScore: number;
  intentType: string;
  urgencyScore: number;
  summary: string;
  matchedTerms: string[];
  suggestedAction: string;
  responseDraft: string;
};

export type DraftState = {
  text: string;
  editing: boolean;
  approved: boolean;
  pushStatus: "idle" | "pushing" | "pushed" | "error";
  pushMessage: string;
};

export const EMPTY_DRAFT: DraftState = {
  text: "",
  editing: false,
  approved: false,
  pushStatus: "idle",
  pushMessage: ""
};

type Props = {
  signal: DraftableSignal;
  draft: DraftState;
  onUpdateDraft: (patch: Partial<DraftState>) => void;
  onPush: () => void;
};

export function SignalDraftCard({ signal, draft, onUpdateDraft, onPush }: Props) {
  return (
    <article className="liveSignal">
      <div className="opportunityTop">
        <div className="source">
          <span>{signal.sourceLabel}</span>
        </div>
        <span className="score">{signal.intentScore}</span>
      </div>
      <h3>{signal.title}</h3>
      <p>{signal.text || "No body text available."}</p>
      <div className="metaRow">
        <span className="pill">{signal.author}</span>
        <span className="pill">{signal.intentType || "need"}</span>
        <span className="pill">urgency {signal.urgencyScore}</span>
        <span className="pill">
          {signal.matchedTerms.length
            ? signal.matchedTerms.join(", ")
            : "semantic match"}
        </span>
      </div>
      {signal.summary ? <p className="metricHint">{signal.summary}</p> : null}
      <div className="suggestedAction">{signal.suggestedAction}</div>
      <div className="approvalDraft">
        <div>
          <strong>{draft.approved ? "Approved draft" : "Draft to approve"}</strong>
          <span>Prepared for this exact signal</span>
        </div>
        {draft.editing ? (
          <textarea
            className="draftEditor"
            rows={5}
            value={draft.text}
            onChange={(event) => onUpdateDraft({ text: event.target.value })}
          />
        ) : (
          <p>{draft.text}</p>
        )}
        <div className="approvalActions">
          <button
            className="button"
            type="button"
            onClick={() =>
              onUpdateDraft({ editing: !draft.editing, approved: false })
            }
          >
            {draft.editing ? "Done editing" : "Edit draft"}
          </button>
          <button
            className="button primary"
            type="button"
            disabled={draft.approved}
            onClick={() => onUpdateDraft({ approved: true, editing: false })}
          >
            {draft.approved ? (
              <>
                <Check size={15} aria-hidden="true" /> Approved
              </>
            ) : (
              "Approve"
            )}
          </button>
          <button
            className="button"
            type="button"
            disabled={
              !draft.approved ||
              draft.pushStatus === "pushing" ||
              draft.pushStatus === "pushed"
            }
            title={
              draft.approved
                ? "Push this lead to Brandlytics CRM"
                : "Approve the draft first"
            }
            onClick={onPush}
          >
            {draft.pushStatus === "pushing" ? (
              <Loader2 size={15} aria-hidden="true" />
            ) : (
              <Send size={15} aria-hidden="true" />
            )}
            {draft.pushStatus === "pushed" ? "Pushed to CRM" : "Push to CRM"}
          </button>
        </div>
        {draft.pushMessage ? (
          <p className={draft.pushStatus === "error" ? "scanError" : "pushSuccess"}>
            {draft.pushMessage}
          </p>
        ) : null}
      </div>
      {signal.url ? (
        <a href={signal.url} target="_blank" rel="noreferrer">
          Open source <ExternalLink size={13} aria-hidden="true" />
        </a>
      ) : null}
    </article>
  );
}
