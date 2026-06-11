"use client";

import { useState } from "react";
import { Bot, Loader2, Search } from "lucide-react";
import {
  SignalDraftCard,
  type DraftableSignal,
  type DraftState
} from "./signal-draft-card";

type LiveSignal = {
  id: string;
  title: string;
  text: string;
  author: string;
  subreddit?: string;
  sourceLabel?: string;
  profileUrl?: string;
  url: string;
  score: number;
  comments: number;
  createdAt: string;
  intentScore: number;
  intentType: string;
  urgencyScore: number;
  summary: string;
  matchedTerms: string[];
  suggestedAction: string;
  responseDraft: string;
};

type ScanResponse = {
  ok: boolean;
  query: string;
  engine?: string;
  scannedAt: string;
  signals: LiveSignal[];
  error?: string;
};

const ENGINE_LABELS: Record<string, string> = {
  openai: "OpenAI engine",
  anthropic: "Claude engine",
  deepseek: "DeepSeek engine",
  "rule-based": "Rule-based scoring (connect an AI engine for real classification)"
};

const PLATFORMS: Record<
  string,
  { label: string; hint: string }
> = {
  hackernews: {
    label: "Hacker News",
    hint: "No credentials needed. Searches stories and comments in real time."
  },
  bluesky: {
    label: "Bluesky",
    hint: "No credentials needed. Searches latest public posts in real time."
  },
  mastodon: {
    label: "Mastodon",
    hint: "No credentials needed. Scans the public timeline for the first word of your query as a hashtag."
  },
  reddit: {
    label: "Reddit",
    hint: "Needs REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (Reddit now requires app approval under its Responsible Builder Policy)."
  }
};

function sourceLabelFor(signal: LiveSignal) {
  return signal.sourceLabel || `Reddit / r/${signal.subreddit || "all"}`;
}

function profileUrlFor(signal: LiveSignal) {
  return signal.profileUrl || `https://www.reddit.com/user/${signal.author}`;
}

export function LiveSignalTester() {
  const [platform, setPlatform] = useState("hackernews");
  const [offerName, setOfferName] = useState("Prayer App");
  const [query, setQuery] = useState("how do I pray OR need prayer");
  const [signalTerms, setSignalTerms] = useState(
    "need prayer, how do I pray, prayer routine, fasting guide, spiritual help"
  );
  const [subreddit, setSubreddit] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});

  const platformInfo = PLATFORMS[platform] || PLATFORMS.hackernews;

  function updateDraft(id: string, patch: Partial<DraftState>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch }
    }));
  }

  async function runScan() {
    setIsLoading(true);
    setResult(null);
    setDrafts({});

    const params = new URLSearchParams({
      offerName,
      query,
      signalTerms,
      limit: "8"
    });

    let endpoint = `/api/signals/scan?platform=${platform}&${params.toString()}`;
    if (platform === "reddit") {
      params.set("subreddit", subreddit);
      endpoint = `/api/signals/reddit?${params.toString()}`;
    }

    try {
      const response = await fetch(endpoint);
      const data = (await response.json()) as ScanResponse;
      setResult(data);

      const initialDrafts: Record<string, DraftState> = {};
      for (const signal of data.signals || []) {
        initialDrafts[signal.id] = {
          text: signal.responseDraft,
          editing: false,
          approved: false,
          pushStatus: "idle",
          pushMessage: ""
        };
      }
      setDrafts(initialDrafts);
    } catch {
      setResult({
        ok: false,
        query,
        scannedAt: new Date().toISOString(),
        signals: [],
        error: "Signal scan failed before a response was returned."
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function pushToCrm(signal: LiveSignal) {
    const draft = drafts[signal.id];
    updateDraft(signal.id, { pushStatus: "pushing", pushMessage: "" });

    try {
      const response = await fetch("/api/crm/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          lead_name: signal.author,
          profile_url: profileUrlFor(signal),
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
        updateDraft(signal.id, {
          pushStatus: "pushed",
          pushMessage: "Lead pushed to Brandlytics CRM."
        });
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

  return (
    <div className="liveTester">
      <div className="liveForm">
        <label>
          Platform to scan
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
          >
            {Object.entries(PLATFORMS).map(([value, info]) => (
              <option key={value} value={value}>
                {info.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Offer to test
          <input
            value={offerName}
            onChange={(event) => setOfferName(event.target.value)}
          />
        </label>
        <label>
          Search query
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          Signal terms
          <textarea
            value={signalTerms}
            onChange={(event) => setSignalTerms(event.target.value)}
          />
        </label>
        {platform === "reddit" ? (
          <label>
            Subreddit filter
            <input
              placeholder="Optional, for example PrayerRequests"
              value={subreddit}
              onChange={(event) => setSubreddit(event.target.value)}
            />
          </label>
        ) : null}
        <p className="connectorNote">
          {platformInfo.hint} AI scoring activates when OPENAI_API_KEY,
          ANTHROPIC_API_KEY, or DEEPSEEK_API_KEY is set.
        </p>
        <button
          className="button primary liveButton"
          disabled={isLoading}
          onClick={runScan}
          type="button"
        >
          {isLoading ? (
            <Loader2 size={17} aria-hidden="true" />
          ) : (
            <Search size={17} aria-hidden="true" />
          )}
          {isLoading
            ? `Scanning ${platformInfo.label}`
            : `Run live ${platformInfo.label} scan`}
        </button>
      </div>

      <div className="liveResults">
        <div className="liveResultsHeader">
          <div>
            <strong>Real-time scan output</strong>
            <span>
              {result
                ? `${result.signals.length} signals found${
                    result.engine
                      ? ` / ${ENGINE_LABELS[result.engine] || result.engine}`
                      : ""
                  }`
                : "Results will appear here"}
            </span>
          </div>
          <Bot size={18} aria-hidden="true" />
        </div>

        {result?.error ? <p className="scanError">{result.error}</p> : null}

        {result?.signals.map((signal) => {
          const draft = drafts[signal.id];
          if (!draft) return null;

          const draftableSignal: DraftableSignal = {
            id: signal.id,
            title: signal.title,
            text: signal.text,
            author: signal.author,
            url: signal.url,
            sourceLabel: sourceLabelFor(signal),
            intentScore: signal.intentScore,
            intentType: signal.intentType,
            urgencyScore: signal.urgencyScore,
            summary: signal.summary,
            matchedTerms: signal.matchedTerms,
            suggestedAction: signal.suggestedAction,
            responseDraft: signal.responseDraft
          };

          return (
            <SignalDraftCard
              key={signal.id}
              signal={draftableSignal}
              draft={draft}
              onUpdateDraft={(patch) => updateDraft(signal.id, patch)}
              onPush={() => pushToCrm(signal)}
            />
          );
        })}
      </div>
    </div>
  );
}
