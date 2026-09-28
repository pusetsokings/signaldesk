import { classifyCandidates, type EngineCandidate } from "@/lib/engine";
import { buildResponseDraft, scoreSignal, splitTerms } from "@/lib/scoring";
import { PLATFORM_FETCHERS, type RawSignal } from "@/lib/connectors";
import {
  existingSignalIds,
  insertSignals,
  updateWatchlist,
  type StoredSignal,
  type Watchlist
} from "@/lib/db";
import { notifyHotSignals } from "@/lib/notify";

export type WatchlistRunResult = {
  watchlistId: string;
  watchlistName: string;
  platforms: Record<string, { found: number; new: number; error?: string }>;
  inserted: number;
  hot: number;
  engine: string;
};

const SCAN_LIMIT_PER_PLATFORM = 10;

export async function runWatchlist(watchlist: Watchlist): Promise<WatchlistRunResult> {
  const signalTerms = splitTerms(watchlist.signal_terms);
  const platformStats: WatchlistRunResult["platforms"] = {};
  const fresh: RawSignal[] = [];

  for (const platform of watchlist.platforms) {
    const fetcher = PLATFORM_FETCHERS[platform];
    if (!fetcher) {
      platformStats[platform] = { found: 0, new: 0, error: "Unsupported platform" };
      continue;
    }
    try {
      const raw = await fetcher(watchlist.query, SCAN_LIMIT_PER_PLATFORM);
      const known = await existingSignalIds(raw.map((signal) => signal.id));
      const unseen = raw.filter((signal) => !known.has(signal.id));
      platformStats[platform] = { found: raw.length, new: unseen.length };
      fresh.push(...unseen);
    } catch (error) {
      platformStats[platform] = {
        found: 0,
        new: 0,
        error: error instanceof Error ? error.message : "Scan failed"
      };
    }
  }

  let engine = "rule-based";
  let inserted = 0;
  let hot = 0;

  if (fresh.length > 0) {
    const scored = fresh.map((raw) => {
      const result = scoreSignal(`${raw.title} ${raw.text}`, signalTerms);
      return {
        raw,
        intentScore: result.intentScore,
        intentType: "none",
        urgencyScore: Math.max(0, result.intentScore - 20),
        summary: "",
        matchedTerms: result.matchedTerms,
        suggestedAction: `Review for ${watchlist.offer_name}.`,
        responseDraft: buildResponseDraft(
          watchlist.offer_name,
          raw.title,
          result.matchedTerms
        )
      };
    });

    const candidates: EngineCandidate[] = scored.map((item) => ({
      id: item.raw.id,
      title: item.raw.title,
      text: item.raw.text.slice(0, 2000),
      author: item.raw.author,
      source: item.raw.sourceLabel,
      url: item.raw.url
    }));

    const classified = await classifyCandidates(
      { offerName: watchlist.offer_name, signalTerms },
      candidates
    );

    if (classified) {
      engine = classified.engine;
      const byId = new Map(classified.classifications.map((item) => [item.id, item]));
      for (const item of scored) {
        const match = byId.get(item.raw.id);
        if (!match) continue;
        item.intentScore = match.intentScore;
        item.intentType = match.intentType;
        item.urgencyScore = match.urgencyScore;
        item.summary = match.summary;
        item.suggestedAction = match.suggestedAction;
        if (match.responseDraft || match.draftSkipped) item.responseDraft = match.responseDraft;
      }
    }

    const rows: Array<Omit<StoredSignal, "status" | "found_at">> = scored.map((item) => ({
      id: item.raw.id,
      watchlist_id: watchlist.id,
      platform: item.raw.id.split("-")[0],
      title: item.raw.title.slice(0, 300),
      text: item.raw.text.slice(0, 2000),
      author: item.raw.author,
      url: item.raw.url,
      profile_url: item.raw.profileUrl,
      source_label: item.raw.sourceLabel,
      intent_score: item.intentScore,
      intent_type: item.intentType,
      urgency_score: item.urgencyScore,
      summary: item.summary,
      matched_terms: item.matchedTerms,
      suggested_action: item.suggestedAction,
      response_draft: item.responseDraft,
      engine
    }));

    inserted = await insertSignals(rows);

    const hotSignals = scored.filter(
      (item) => item.intentScore >= watchlist.min_intent_score
    );
    hot = hotSignals.length;

    if (hotSignals.length > 0) {
      await notifyHotSignals(
        watchlist,
        hotSignals.map((item) => ({
          id: item.raw.id,
          title: item.raw.title,
          author: item.raw.author,
          url: item.raw.url,
          sourceLabel: item.raw.sourceLabel,
          intentScore: item.intentScore,
          intentType: item.intentType,
          summary: item.summary
        }))
      );
    }
  }

  await updateWatchlist(watchlist.id, { last_scanned_at: new Date().toISOString() });

  return {
    watchlistId: watchlist.id,
    watchlistName: watchlist.name,
    platforms: platformStats,
    inserted,
    hot,
    engine
  };
}
