import { NextRequest, NextResponse } from "next/server";
import { classifyCandidates, type EngineCandidate } from "@/lib/engine";
import { buildResponseDraft, scoreSignal, splitTerms } from "@/lib/scoring";

/**
 * Multi-platform live signal scan. Unlike Reddit, these platforms expose
 * public search/timeline APIs that need no credentials, so live scans work
 * out of the box: Hacker News (Algolia), Bluesky (public AppView), and
 * Mastodon (public hashtag timeline).
 */

type RawSignal = {
  id: string;
  title: string;
  text: string;
  author: string;
  sourceLabel: string;
  url: string;
  profileUrl: string;
  score: number;
  comments: number;
  createdAt: string;
};

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHackerNews(query: string, limit: number) {
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(
    query
  )}&tags=(story,comment)&hitsPerPage=${limit}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "SignalDesk/0.1 by Brandlytics" },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`Hacker News search returned ${response.status}.`);
  }

  const payload = (await response.json()) as {
    hits?: Array<{
      objectID: string;
      title?: string;
      story_title?: string;
      story_text?: string;
      comment_text?: string;
      author?: string;
      created_at?: string;
      points?: number;
      num_comments?: number;
    }>;
  };

  return (payload.hits || []).map((hit): RawSignal => {
    const title = hit.title || hit.story_title || "Hacker News post";
    const text = stripHtml(hit.comment_text || hit.story_text || "");
    return {
      id: `hn-${hit.objectID}`,
      title,
      text,
      author: hit.author || "unknown",
      sourceLabel: "Hacker News",
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      profileUrl: `https://news.ycombinator.com/user?id=${hit.author || ""}`,
      score: hit.points || 0,
      comments: hit.num_comments || 0,
      createdAt: hit.created_at || new Date().toISOString()
    };
  });
}

async function fetchBluesky(query: string, limit: number) {
  const url = `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(
    query
  )}&limit=${limit}&sort=latest`;

  const response = await fetch(url, {
    headers: { "User-Agent": "SignalDesk/0.1 by Brandlytics" },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`Bluesky search returned ${response.status}.`);
  }

  const payload = (await response.json()) as {
    posts?: Array<{
      uri: string;
      author?: { handle?: string; displayName?: string };
      record?: { text?: string; createdAt?: string };
      replyCount?: number;
      likeCount?: number;
    }>;
  };

  return (payload.posts || []).map((post): RawSignal => {
    const handle = post.author?.handle || "unknown";
    const rkey = post.uri.split("/").pop() || "";
    const text = post.record?.text || "";
    return {
      id: `bsky-${rkey}`,
      title: text.slice(0, 90) || "Bluesky post",
      text,
      author: handle,
      sourceLabel: "Bluesky",
      url: `https://bsky.app/profile/${handle}/post/${rkey}`,
      profileUrl: `https://bsky.app/profile/${handle}`,
      score: post.likeCount || 0,
      comments: post.replyCount || 0,
      createdAt: post.record?.createdAt || new Date().toISOString()
    };
  });
}

async function fetchMastodon(query: string, limit: number) {
  // Mastodon's public API supports hashtag timelines without auth, so the
  // first search term is converted to a hashtag (e.g. "prayer life" -> #prayer).
  const tag = query
    .split(/[\s,]+/)[0]
    .replace(/[^\p{L}\p{N}_]/gu, "")
    .toLowerCase();

  if (!tag) {
    throw new Error("Mastodon scans need at least one word to use as a hashtag.");
  }

  const url = `https://mastodon.social/api/v1/timelines/tag/${encodeURIComponent(
    tag
  )}?limit=${limit}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "SignalDesk/0.1 by Brandlytics" },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`Mastodon returned ${response.status} for #${tag}.`);
  }

  const payload = (await response.json()) as Array<{
    id: string;
    url?: string;
    content?: string;
    created_at?: string;
    replies_count?: number;
    favourites_count?: number;
    account?: { acct?: string; url?: string; display_name?: string };
  }>;

  return (payload || []).map((status): RawSignal => {
    const text = stripHtml(status.content || "");
    return {
      id: `masto-${status.id}`,
      title: text.slice(0, 90) || `Mastodon post tagged #${tag}`,
      text,
      author: status.account?.acct || "unknown",
      sourceLabel: `Mastodon / #${tag}`,
      url: status.url || "https://mastodon.social",
      profileUrl: status.account?.url || "https://mastodon.social",
      score: status.favourites_count || 0,
      comments: status.replies_count || 0,
      createdAt: status.created_at || new Date().toISOString()
    };
  });
}

const PLATFORM_FETCHERS: Record<
  string,
  (query: string, limit: number) => Promise<RawSignal[]>
> = {
  hackernews: fetchHackerNews,
  bluesky: fetchBluesky,
  mastodon: fetchMastodon
};

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
          if (classified.responseDraft) {
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
