import { NextRequest, NextResponse } from "next/server";
import { classifyCandidates, type EngineCandidate } from "@/lib/engine";
import { buildResponseDraft, scoreSignal, splitTerms } from "@/lib/scoring";

type RedditChild = {
  data: {
    id: string;
    title?: string;
    selftext?: string;
    author?: string;
    subreddit?: string;
    permalink?: string;
    score?: number;
    num_comments?: number;
    created_utc?: number;
  };
};

type RedditAccessToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

async function getRedditAccessToken() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "SignalDesk/0.1 by Brandlytics"
    },
    body: "grant_type=client_credentials",
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const token = (await response.json()) as RedditAccessToken;
  return token.access_token;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query")?.trim() || "how do I pray";
  const offerName = searchParams.get("offerName")?.trim() || "Configured offer";
  const subreddit = searchParams.get("subreddit")?.trim().replace(/^r\//, "");
  const signalTerms = splitTerms(searchParams.get("signalTerms") || "");
  const limit = Math.min(Number(searchParams.get("limit") || 8), 15);

  const encodedQuery = encodeURIComponent(query);
  const accessToken = await getRedditAccessToken();
  const baseUrl = accessToken ? "https://oauth.reddit.com" : "https://www.reddit.com";
  const redditUrl = subreddit
    ? `${baseUrl}/r/${encodeURIComponent(
        subreddit
      )}/search.json?q=${encodedQuery}&restrict_sr=1&sort=new&limit=${limit}`
    : `${baseUrl}/search.json?q=${encodedQuery}&sort=new&limit=${limit}`;

  try {
    const response = await fetch(redditUrl, {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        "User-Agent": "SignalDesk/0.1 by Brandlytics"
      },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          query,
          scannedAt: new Date().toISOString(),
          signals: [],
          error:
            response.status === 403 && !accessToken
              ? "Reddit blocked anonymous search. Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in Vercel to run authenticated live scans."
              : `Reddit returned ${response.status}. Try a simpler query or a specific subreddit.`
        },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as {
      data?: { children?: RedditChild[] };
    };

    const signals = (payload.data?.children || []).map((child) => {
      const data = child.data;
      const title = data.title || "";
      const text = data.selftext || "";
      const scored = scoreSignal(`${title} ${text}`, signalTerms);

      return {
        id: data.id,
        title,
        text: text.slice(0, 360),
        fullText: text.slice(0, 2000),
        author: data.author || "unknown",
        subreddit: data.subreddit || subreddit || "all",
        url: `https://www.reddit.com${data.permalink || ""}`,
        score: data.score || 0,
        comments: data.num_comments || 0,
        createdAt: data.created_utc
          ? new Date(data.created_utc * 1000).toISOString()
          : new Date().toISOString(),
        intentScore: scored.intentScore,
        intentType: "need",
        urgencyScore: Math.max(0, scored.intentScore - 20),
        summary: "",
        matchedTerms: scored.matchedTerms,
        suggestedAction:
          scored.intentScore >= 80
            ? `High-intent signal for ${offerName}. Draft a value-first reply, then offer the resource if they engage.`
            : `Review for ${offerName}. It may be useful, but needs human judgment before outreach.`,
        responseDraft: buildResponseDraft(offerName, title, scored.matchedTerms)
      };
    });

    // AI classification pass: replaces the rule-based scores and drafts when
    // an engine provider (OpenAI/Claude/DeepSeek) is configured. Falls back
    // to the rule-based values above when no provider succeeds.
    let engine = "rule-based";
    if (signals.length > 0) {
      const candidates: EngineCandidate[] = signals.map((signal) => ({
        id: signal.id,
        title: signal.title,
        text: signal.fullText,
        author: signal.author,
        source: `reddit/r/${signal.subreddit}`,
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
      query,
      engine,
      scannedAt: new Date().toISOString(),
      signals: signals.map(({ fullText: _fullText, ...signal }) => signal)
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        query,
        scannedAt: new Date().toISOString(),
        signals: [],
        error:
          "Unable to reach Reddit from this environment. Check network access or try again later."
      },
      { status: 502 }
    );
  }
}
