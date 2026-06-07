"use client";

import { useState } from "react";
import { Bot, ExternalLink, Loader2, Search } from "lucide-react";

type RedditSignal = {
  id: string;
  title: string;
  text: string;
  author: string;
  subreddit: string;
  url: string;
  score: number;
  comments: number;
  createdAt: string;
  intentScore: number;
  matchedTerms: string[];
  suggestedAction: string;
  responseDraft: string;
};

type ScanResponse = {
  ok: boolean;
  query: string;
  scannedAt: string;
  signals: RedditSignal[];
  error?: string;
};

export function LiveSignalTester() {
  const [offerName, setOfferName] = useState("Prayer App");
  const [query, setQuery] = useState("how do I pray OR need prayer");
  const [signalTerms, setSignalTerms] = useState(
    "need prayer, how do I pray, prayer routine, fasting guide, spiritual help"
  );
  const [subreddit, setSubreddit] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);

  async function runScan() {
    setIsLoading(true);
    setResult(null);

    const params = new URLSearchParams({
      offerName,
      query,
      signalTerms,
      subreddit,
      limit: "8"
    });

    try {
      const response = await fetch(`/api/signals/reddit?${params.toString()}`);
      const data = (await response.json()) as ScanResponse;
      setResult(data);
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

  return (
    <div className="liveTester">
      <div className="liveForm">
        <label>
          Offer to test
          <input
            value={offerName}
            onChange={(event) => setOfferName(event.target.value)}
          />
        </label>
        <label>
          Reddit search query
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          Signal terms
          <textarea
            value={signalTerms}
            onChange={(event) => setSignalTerms(event.target.value)}
          />
        </label>
        <label>
          Subreddit filter
          <input
            placeholder="Optional, for example PrayerRequests"
            value={subreddit}
            onChange={(event) => setSubreddit(event.target.value)}
          />
        </label>
        <p className="connectorNote">
          Production live scans require Reddit API credentials in Vercel:
          REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.
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
          {isLoading ? "Scanning Reddit" : "Run live Reddit scan"}
        </button>
      </div>

      <div className="liveResults">
        <div className="liveResultsHeader">
          <div>
            <strong>Real-time scan output</strong>
            <span>
              {result
                ? `${result.signals.length} signals found`
                : "Results will appear here"}
            </span>
          </div>
          <Bot size={18} aria-hidden="true" />
        </div>

        {result?.error ? <p className="scanError">{result.error}</p> : null}

        {result?.signals.map((signal) => (
          <article className="liveSignal" key={signal.id}>
            <div className="opportunityTop">
              <div className="source">
                <span>Reddit / r/{signal.subreddit}</span>
              </div>
              <span className="score">{signal.intentScore}</span>
            </div>
            <h3>{signal.title}</h3>
            <p>{signal.text || "No body text available."}</p>
            <div className="metaRow">
              <span className="pill">{signal.author}</span>
              <span className="pill">{signal.comments} comments</span>
              <span className="pill">
                {signal.matchedTerms.length
                  ? signal.matchedTerms.join(", ")
                  : "semantic match"}
              </span>
            </div>
            <div className="suggestedAction">{signal.suggestedAction}</div>
            <div className="approvalDraft">
              <div>
                <strong>Draft to approve</strong>
                <span>Prepared for this exact signal</span>
              </div>
              <p>{signal.responseDraft}</p>
              <div className="approvalActions">
                <button className="button" type="button">
                  Edit draft
                </button>
                <button className="button primary" type="button">
                  Approve
                </button>
                <button className="button" type="button">
                  Push to CRM
                </button>
              </div>
            </div>
            <a href={signal.url} target="_blank" rel="noreferrer">
              Open source <ExternalLink size={13} aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
