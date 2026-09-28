"use client";

import { useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import {
  SignalDraftCard,
  type DraftableSignal,
  type DraftState
} from "./signal-draft-card";
import { WorkspaceSelect, useCrmWorkspaces } from "./workspace-select";

type ManualSignal = {
  id: string;
  title: string;
  text: string;
  author: string;
  url: string;
  intentScore: number;
  intentType: string;
  urgencyScore: number;
  summary: string;
  matchedTerms: string[];
  suggestedAction: string;
  responseDraft: string;
};

type ManualResponse = {
  ok: boolean;
  engine?: string;
  platform?: string;
  signal?: ManualSignal;
  error?: string;
};

const ENGINE_LABELS: Record<string, string> = {
  openai: "OpenAI engine",
  anthropic: "Claude engine",
  deepseek: "DeepSeek engine",
  typesafe: "TypeSafe triage",
  "rule-based": "Rule-based scoring (connect an AI engine for real classification)"
};

const PLATFORM_OPTIONS = [
  "reddit",
  "twitter/x",
  "facebook",
  "linkedin",
  "youtube",
  "forum",
  "other"
];

export function ManualSignalEntry() {
  const [offerName, setOfferName] = useState("Prayer App");
  const [signalTerms, setSignalTerms] = useState(
    "need prayer, how do I pray, prayer routine, fasting guide, spiritual help"
  );
  const [platform, setPlatform] = useState(PLATFORM_OPTIONS[0]);
  const [author, setAuthor] = useState("");
  const [url, setUrl] = useState("");
  const [postText, setPostText] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const workspaces = useCrmWorkspaces();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ManualResponse | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);

  function updateDraft(patch: Partial<DraftState>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  async function classify() {
    if (!postText.trim() || !url.trim()) return;

    setIsLoading(true);
    setResult(null);
    setDraft(null);

    try {
      const response = await fetch("/api/signals/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerName,
          signalTerms,
          platform,
          author,
          url,
          text: postText
        })
      });
      const data = (await response.json()) as ManualResponse;
      setResult(data);

      if (data.ok && data.signal) {
        setDraft({
          text: data.signal.responseDraft,
          editing: false,
          approved: false,
          pushStatus: "idle",
          pushMessage: ""
        });
      }
    } catch {
      setResult({ ok: false, error: "Classification failed before a response was returned." });
    } finally {
      setIsLoading(false);
    }
  }

  async function pushToCrm() {
    const signal = result?.signal;
    if (!signal) return;

    updateDraft({ pushStatus: "pushing", pushMessage: "" });

    try {
      const response = await fetch("/api/crm/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(workspaceId ? { workspace_id: workspaceId } : {}),
          platform,
          lead_name: signal.author,
          profile_url: signal.url,
          source_url: signal.url,
          signal_text: `${signal.title} ${signal.text}`.trim().slice(0, 1000),
          matched_offer: offerName,
          intent_type: signal.intentType || "need",
          intent_score: signal.intentScore,
          urgency_score: signal.urgencyScore,
          location: "Global",
          recommended_action: signal.suggestedAction,
          response_draft: draft?.text || signal.responseDraft
        })
      });
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (data.ok) {
        updateDraft({ pushStatus: "pushed", pushMessage: "Lead pushed to Brandlytics CRM." });
      } else {
        updateDraft({ pushStatus: "error", pushMessage: data.error || "CRM push failed." });
      }
    } catch {
      updateDraft({
        pushStatus: "error",
        pushMessage: "CRM push failed before a response was returned."
      });
    }
  }

  const draftableSignal: DraftableSignal | null = result?.signal
    ? {
        id: result.signal.id,
        title: result.signal.title,
        text: result.signal.text,
        author: result.signal.author,
        url: result.signal.url,
        sourceLabel: `Manual / ${platform}`,
        intentScore: result.signal.intentScore,
        intentType: result.signal.intentType,
        urgencyScore: result.signal.urgencyScore,
        summary: result.signal.summary,
        matchedTerms: result.signal.matchedTerms,
        suggestedAction: result.signal.suggestedAction,
        responseDraft: result.signal.responseDraft
      }
    : null;

  return (
    <div className="liveTester">
      <div className="liveForm">
        <label>
          Offer to match
          <input
            value={offerName}
            onChange={(event) => setOfferName(event.target.value)}
          />
        </label>
        <label>
          Signal terms
          <textarea
            value={signalTerms}
            onChange={(event) => setSignalTerms(event.target.value)}
          />
        </label>
        <label>
          Platform
          <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
            {PLATFORM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Author / username
          <input
            placeholder="e.g. u/someone"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
          />
        </label>
        <label>
          Post URL
          <input
            placeholder="Link to the post you found"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <WorkspaceSelect
          workspaces={workspaces}
          value={workspaceId}
          onChange={setWorkspaceId}
        />
        <label>
          Paste the post text
          <textarea
            placeholder="Paste the title and body of the post here"
            rows={5}
            value={postText}
            onChange={(event) => setPostText(event.target.value)}
          />
        </label>
        <p className="connectorNote">
          Found a real post asking for what you sell? Paste it here. SignalDesk
          scores it, writes a draft reply, and (once approved) pushes it to
          Brandlytics CRM &mdash; no Reddit API access required.
        </p>
        <button
          className="button primary liveButton"
          disabled={isLoading || !postText.trim() || !url.trim()}
          onClick={classify}
          type="button"
        >
          {isLoading ? (
            <Loader2 size={17} aria-hidden="true" />
          ) : (
            <Sparkles size={17} aria-hidden="true" />
          )}
          {isLoading ? "Classifying" : "Classify and draft reply"}
        </button>
      </div>

      <div className="liveResults">
        <div className="liveResultsHeader">
          <div>
            <strong>Classification output</strong>
            <span>
              {result?.engine
                ? `${ENGINE_LABELS[result.engine] || result.engine}`
                : "Result will appear here"}
            </span>
          </div>
          <Bot size={18} aria-hidden="true" />
        </div>

        {result && !result.ok ? <p className="scanError">{result.error}</p> : null}

        {draftableSignal && draft ? (
          <SignalDraftCard
            signal={draftableSignal}
            draft={draft}
            onUpdateDraft={updateDraft}
            onPush={pushToCrm}
          />
        ) : null}
      </div>
    </div>
  );
}
