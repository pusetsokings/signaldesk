import { NextRequest, NextResponse } from "next/server";
import { classifyCandidates, type EngineCandidate } from "@/lib/engine";
import { buildResponseDraft, scoreSignal, splitTerms } from "@/lib/scoring";
import { PLATFORM_FETCHERS } from "@/lib/connectors";

/**
 * Multi-platform live signal scan. Hacker News, Bluesky, and Mastodon work
 * with no credentials; Reddit activates once API credentials are set.
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const platform = (searchParams.get("platform") || "hackernews").toLowerCase();
  const query = searchParams.get("query")?.trim() || "how do I pray";
  const offerName = searchParams.get("offerName")?.trim() || "Configured offer";
  const signalTerms = splitTerms(searchParams.get("signalTerms") || "");
  const limit = Math.min(Number(searchParams.get("limit") || 8), 15);

  const fetcher = PLATFORM_FETCHERS[platform];
  if (!fetcher) {
    return NextResponse.json(
      {
        ok: false,
        query,
        scannedAt: new Date().toISOString(),
        signals: [],
        error: `Unknown platform "${platform}". Supported: ${Object.keys(
          PLATFORM_FETCHERS
        ).join(", ")}.`
      },
      { status: 400 }
    );
  }

  try {
    const rawSignals = await fetcher(query, limit);

    const signals = rawSignals.map((raw) => {
      const scored = scoreSignal(`${raw.title} ${raw.text}`, signalTerms);
      return {
        ...raw,
        fullText: raw.text.slice(0, 2000),
        text: raw.text.slice(0, 360),
        intentScore: scored.intentScore,
        intentType: "need",
        urgencyScore: Math.max(0, scored.intentScore - 20),
        summary: "",
        matchedTerms: scored.matchedTerms,
        suggestedAction:
          scored.intentScore >= 80
            ? `High-intent signal for ${offerName}. Draft a value-first reply, then offer the resource if they engage.`
            : `Review for ${offerName}. It may be useful, but needs human judgment before outreach.`,
        responseDraft: buildResponseDraft(offerName, raw.title, scored.matchedTerms)
      };
    });

    // AI classification pass, same as the Reddit route: replaces rule-based
    // scores and drafts when an engine provider is configured.
    let engine = "rule-based";
    if (signals.length > 0) {
      const candidates: EngineCandidate[] = signals.map((signal) => ({
        id: signal.id,
        title: signal.title,
        text: signal.fullText,
        author: signal.author,
        source: signal.sourceLabel,
        url: signal.url
      }));

      const result = await classifyCandidates(
        { offerName, signalTerms },
        candidates
      );

      if (result) {
        engine = result.engine;
        const byId = new Map(
          result.classifications.map((item) => [item.id, item])
        );
        for (const signal of signals) {
          const classified = byId.get(signal.id);
          if (!classified) continue;
          signal.intentScore = classified.intentScore;
          signal.intentType = classified.intentType;
          signal.urgencyScore = classified.urgencyScore;
          signal.summary = classified.summary;
          signal.suggestedAction = classified.suggestedAction;
          if (classified.responseDraft || classified.draftSkipped) {
            signal.responseDraft = classified.responseDraft;
          }
        }
        signals.sort((a, b) => b.intentScore - a.intentScore);
      }
    }

    return NextResponse.json({
      ok: true,
      platform,
      query,
      engine,
      scannedAt: new Date().toISOString(),
      signals: signals.map(({ fullText: _fullText, ...signal }) => signal)
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        platform,
        query,
        scannedAt: new Date().toISOString(),
        signals: [],
        error:
          error instanceof Error
            ? error.message
            : `Unable to reach ${platform} from this environment. Try again shortly.`
      },
      { status: 502 }
    );
  }
}
