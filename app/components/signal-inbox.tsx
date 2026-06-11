"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox, Loader2, RefreshCw } from "lucide-react";
import {
  SignalDraftCard,
  type DraftableSignal,
  type DraftState
} from "./signal-draft-card";
import { WorkspaceSelect, useCrmWorkspaces } from "./workspace-select";

type InboxSignal = {
  id: string;
  platform: string;
  title: string;
  text: string;
  author: string;
  url: string;
  profile_url: string;
  source_label: string;
  intent_score: number;
  intent_type: string;
  urgency_score: number;
  summary: string;
  matched_terms: string[];
  suggested_action: string;
  response_draft: string;
  status: string;
  found_at: string;
  watchlist_name?: string | null;
  offer_name?: string | null;
  crm_workspace_id?: string | null;
};

const STATUS_TABS = [
  { value: "new", label: "New" },
  { value: "pushed", label: "Pushed" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" }
];

export function SignalInbox() {
  const [status, setStatus] = useState("new");
  const [signals, setSignals] = useState<InboxSignal[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const workspaces = useCrmWorkspaces();

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/inbox?status=${status}`)
      .then((response) => response.json())
      .then(
        (data: {
          ok: boolean;
          signals: InboxSignal[];
          counts: Record<string, number>;
          error?: string;
        }) => {
          if (!data.ok) {
            setError(data.error || "Could not load the inbox.");
            setSignals([]);
            return;
          }
          setError("");
          setSignals(data.signals);
          setCounts(data.counts);
          const initialDrafts: Record<string, DraftState> = {};
          for (const signal of data.signals) {
            initialDrafts[signal.id] = {
              text: signal.response_draft,
              editing: false,
              approved: signal.status !== "new",
              pushStatus: signal.status === "pushed" ? "pushed" : "idle",
              pushMessage: signal.status === "pushed" ? "Already pushed to CRM." : ""
            };
          }
          setDrafts(initialDrafts);
        }
      )
      .catch(() => setError("Could not load the inbox."))
      .finally(() => setIsLoading(false));
  }, [status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function updateDraft(id: string, patch: Partial<DraftState>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  async function setSignalStatus(id: string, nextStatus: string, responseDraft?: string) {
    await fetch(`/api/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: nextStatus,
        ...(responseDraft !== undefined ? { responseDraft } : {})
      })
    });
  }

  async function pushToCrm(signal: InboxSignal) {
    const draft = drafts[signal.id];
    const targetWorkspace = workspaceId || signal.crm_workspace_id || "";
    updateDraft(signal.id, { pushStatus: "pushing", pushMessage: "" });

    try {
      const response = await fetch("/api/crm/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(targetWorkspace ? { workspace_id: targetWorkspace } : {}),
          platform: signal.platform,
          lead_name: signal.author,
          profile_url: signal.profile_url,
          source_url: signal.url,
          signal_text: `${signal.title} ${signal.text}`.trim().slice(0, 1000),
          matched_offer: signal.offer_name || "Configured offer",
          intent_type: signal.intent_type || "need",
          intent_score: signal.intent_score,
          urgency_score: signal.urgency_score,
          location: "Global",
          recommended_action: signal.suggested_action,
          response_draft: draft?.text || signal.response_draft
        })
      });
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (data.ok) {
        updateDraft(signal.id, {
          pushStatus: "pushed",
          pushMessage: "Lead pushed to Brandlytics CRM."
        });
        await setSignalStatus(signal.id, "pushed", draft?.text);
      } else {
        updateDraft(signal.id, {
          pushStatus: "error",
          pushMessage: data.error || "CRM push failed."
        });
      }
    } catch {
      updateDraft(signal.id, {
        pushStatus: "error",
        pushMessage: "CRM push failed before a response was returned."
      });
    }
  }

  async function dismiss(signal: InboxSignal) {
    await setSignalStatus(signal.id, "dismissed");
    refresh();
  }

  return (
    <div className="signalInbox">
      <div className="inboxToolbar">
        <div className="inboxTabs">
          {STATUS_TABS.map((tab) => (
            <button
              className={`button inboxTab ${status === tab.value ? "primary" : ""}`}
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              type="button"
            >
              {tab.label}
              {tab.value !== "all" && counts[tab.value] ? ` (${counts[tab.value]})` : ""}
            </button>
          ))}
        </div>
        <button className="button" disabled={isLoading} onClick={refresh} type="button">
          {isLoading ? (
            <Loader2 size={15} aria-hidden="true" />
          ) : (
            <RefreshCw size={15} aria-hidden="true" />
          )}
          Refresh
        </button>
      </div>

      <WorkspaceSelect workspaces={workspaces} value={workspaceId} onChange={setWorkspaceId} />

      {error ? <p className="scanError">{error}</p> : null}

      {!error && signals.length === 0 && !isLoading ? (
        <div className="inboxEmpty">
          <Inbox size={20} aria-hidden="true" />
          <p>
            {status === "new"
              ? "No new signals waiting. Watchlist scans run automatically every day — or press Run now on a watchlist above."
              : "Nothing here yet."}
          </p>
        </div>
      ) : null}

      {signals.map((signal) => {
        const draft = drafts[signal.id];
        if (!draft) return null;

        const draftableSignal: DraftableSignal = {
          id: signal.id,
          title: signal.title,
          text: signal.text.slice(0, 360),
          author: signal.author,
          url: signal.url,
          sourceLabel: `${signal.source_label}${
            signal.watchlist_name ? ` · ${signal.watchlist_name}` : ""
          }`,
          intentScore: signal.intent_score,
          intentType: signal.intent_type,
          urgencyScore: signal.urgency_score,
          summary: signal.summary,
          matchedTerms: signal.matched_terms,
          suggestedAction: signal.suggested_action,
          responseDraft: signal.response_draft
        };

        return (
          <div className="inboxItem" key={signal.id}>
            <SignalDraftCard
              signal={draftableSignal}
              draft={draft}
              onUpdateDraft={(patch) => updateDraft(signal.id, patch)}
              onPush={() => pushToCrm(signal)}
            />
            {signal.status === "new" ? (
              <button className="button inboxDismiss" onClick={() => dismiss(signal)} type="button">
                Dismiss
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
