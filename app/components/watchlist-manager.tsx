"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2, Play, Plus, Radar, Trash2 } from "lucide-react";
import { WorkspaceSelect, useCrmWorkspaces } from "./workspace-select";

type Watchlist = {
  id: string;
  name: string;
  offer_name: string;
  query: string;
  signal_terms: string;
  platforms: string[];
  min_intent_score: number;
  crm_workspace_id: string | null;
  magnet_url: string | null;
  is_active: boolean;
  last_scanned_at: string | null;
};

const PLATFORM_LABELS: Record<string, string> = {
  hackernews: "Hacker News",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  reddit: "Reddit"
};

export function WatchlistManager() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [storageError, setStorageError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [offerName, setOfferName] = useState("Prayer App");
  const [query, setQuery] = useState("");
  const [signalTerms, setSignalTerms] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([
    "hackernews",
    "bluesky",
    "mastodon"
  ]);
  const [minScore, setMinScore] = useState(70);
  const [workspaceId, setWorkspaceId] = useState("");
  const workspaces = useCrmWorkspaces();
  const [isSaving, setIsSaving] = useState(false);
  const [runningId, setRunningId] = useState("");
  const [runMessage, setRunMessage] = useState("");
  const [magnetId, setMagnetId] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const refresh = useCallback(() => {
    fetch("/api/watchlists")
      .then((response) => response.json())
      .then((data: { ok: boolean; watchlists: Watchlist[]; error?: string }) => {
        if (data.ok) {
          setWatchlists(data.watchlists);
          setStorageError("");
        } else if (data.error) {
          setStorageError(data.error);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function togglePlatform(platform: string) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  }

  async function saveWatchlist() {
    if (!name.trim() || !query.trim() || platforms.length === 0) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          offerName,
          query,
          signalTerms,
          platforms,
          minIntentScore: minScore,
          crmWorkspaceId: workspaceId
        })
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setShowForm(false);
        setName("");
        setQuery("");
        setSignalTerms("");
        refresh();
      } else {
        setStorageError(data.error || "Could not save watchlist.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(watchlist: Watchlist) {
    await fetch(`/api/watchlists/${watchlist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !watchlist.is_active })
    });
    refresh();
  }

  async function removeWatchlist(watchlist: Watchlist) {
    if (!window.confirm(`Delete watchlist "${watchlist.name}"?`)) return;
    await fetch(`/api/watchlists/${watchlist.id}`, { method: "DELETE" });
    refresh();
  }

  async function generateMagnet(watchlist: Watchlist) {
    setMagnetId(watchlist.id);
    setRunMessage("");
    try {
      const response = await fetch(`/api/watchlists/${watchlist.id}/magnet`, {
        method: "POST"
      });
      const data = (await response.json()) as { ok: boolean; url?: string; error?: string };
      if (data.ok && data.url) {
        setRunMessage(`Tracked capture link ready: ${data.url}`);
      } else {
        setRunMessage(data.error || "Could not create the tracked link.");
      }
    } catch {
      setRunMessage("Could not create the tracked link.");
    } finally {
      setMagnetId("");
      refresh();
    }
  }

  async function copyMagnet(watchlist: Watchlist) {
    if (!watchlist.magnet_url) return;
    try {
      await navigator.clipboard.writeText(watchlist.magnet_url);
      setCopiedId(watchlist.id);
      setTimeout(() => setCopiedId(""), 2000);
    } catch {
      setRunMessage(watchlist.magnet_url);
    }
  }

  async function runNow(watchlist: Watchlist) {
    setRunningId(watchlist.id);
    setRunMessage("");
    try {
      const response = await fetch(`/api/watchlists/${watchlist.id}/run`, {
        method: "POST"
      });
      const data = (await response.json()) as {
        ok: boolean;
        result?: { inserted: number; hot: number };
        error?: string;
      };
      if (data.ok && data.result) {
        setRunMessage(
          `"${watchlist.name}": ${data.result.inserted} new signal${
            data.result.inserted === 1 ? "" : "s"
          } saved to the inbox (${data.result.hot} hot).`
        );
      } else {
        setRunMessage(data.error || "Run failed.");
      }
    } catch {
      setRunMessage("Run failed before a response was returned.");
    } finally {
      setRunningId("");
      refresh();
    }
  }

  return (
    <div className="watchlistManager">
      {storageError ? <p className="scanError">{storageError}</p> : null}

      <div className="watchlistList">
        {watchlists.length === 0 && !showForm ? (
          <p className="connectorNote">
            No watchlists yet. A watchlist is a saved search (offer + query +
            platforms) that SignalDesk scans automatically every day and
            whenever you press Run now. New signals land in the Signal Inbox
            below and hot ones trigger an email alert.
          </p>
        ) : null}

        {watchlists.map((watchlist) => (
          <div className="watchlistRow" key={watchlist.id}>
            <div className="watchlistInfo">
              <strong>{watchlist.name}</strong>
              <span>
                {watchlist.offer_name} · &ldquo;{watchlist.query}&rdquo; ·{" "}
                {watchlist.platforms
                  .map((platform) => PLATFORM_LABELS[platform] || platform)
                  .join(", ")}{" "}
                · hot ≥ {watchlist.min_intent_score}
              </span>
              <span className="watchlistMeta">
                {watchlist.is_active ? "Active" : "Paused"}
                {watchlist.last_scanned_at
                  ? ` · last scan ${new Date(watchlist.last_scanned_at).toLocaleString()}`
                  : " · never scanned"}
              </span>
            </div>
            <div className="watchlistActions">
              <button
                className="button"
                disabled={runningId === watchlist.id}
                onClick={() => runNow(watchlist)}
                type="button"
              >
                {runningId === watchlist.id ? (
                  <Loader2 size={15} aria-hidden="true" />
                ) : (
                  <Play size={15} aria-hidden="true" />
                )}
                Run now
              </button>
              {watchlist.magnet_url ? (
                <button className="button" onClick={() => copyMagnet(watchlist)} type="button">
                  <Link2 size={15} aria-hidden="true" />
                  {copiedId === watchlist.id ? "Copied!" : "Copy magnet link"}
                </button>
              ) : (
                <button
                  className="button"
                  disabled={magnetId === watchlist.id}
                  onClick={() => generateMagnet(watchlist)}
                  type="button"
                >
                  {magnetId === watchlist.id ? (
                    <Loader2 size={15} aria-hidden="true" />
                  ) : (
                    <Link2 size={15} aria-hidden="true" />
                  )}
                  Get tracked link
                </button>
              )}
              <button className="button" onClick={() => toggleActive(watchlist)} type="button">
                {watchlist.is_active ? "Pause" : "Resume"}
              </button>
              <button
                className="button"
                onClick={() => removeWatchlist(watchlist)}
                type="button"
                aria-label={`Delete ${watchlist.name}`}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {runMessage ? <p className="connectorNote">{runMessage}</p> : null}

      {showForm ? (
        <div className="liveForm watchlistForm">
          <label>
            Watchlist name
            <input
              placeholder="e.g. Prayer App — daily hunt"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Offer
            <input value={offerName} onChange={(event) => setOfferName(event.target.value)} />
          </label>
          <label>
            Search query
            <input
              placeholder="e.g. how do I pray OR need prayer"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            Signal terms
            <textarea
              placeholder="comma-separated, e.g. need prayer, prayer routine"
              value={signalTerms}
              onChange={(event) => setSignalTerms(event.target.value)}
            />
          </label>
          <fieldset className="platformChecks">
            <legend>Platforms</legend>
            {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
              <label className="platformCheck" key={value}>
                <input
                  checked={platforms.includes(value)}
                  onChange={() => togglePlatform(value)}
                  type="checkbox"
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label>
            Hot signal threshold (email alert at or above this intent score)
            <input
              max={100}
              min={0}
              onChange={(event) => setMinScore(Number(event.target.value))}
              type="number"
              value={minScore}
            />
          </label>
          <WorkspaceSelect
            workspaces={workspaces}
            value={workspaceId}
            onChange={setWorkspaceId}
          />
          <div className="watchlistFormActions">
            <button
              className="button primary"
              disabled={isSaving || !name.trim() || !query.trim()}
              onClick={saveWatchlist}
              type="button"
            >
              {isSaving ? <Loader2 size={15} aria-hidden="true" /> : <Radar size={15} aria-hidden="true" />}
              Save watchlist
            </button>
            <button className="button" onClick={() => setShowForm(false)} type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="button primary liveButton" onClick={() => setShowForm(true)} type="button">
          <Plus size={16} aria-hidden="true" />
          New watchlist
        </button>
      )}
    </div>
  );
}
