import { NextRequest, NextResponse } from "next/server";

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

const buyingIntentTerms = [
  "need",
  "looking for",
  "recommend",
  "recommendation",
  "where can i",
  "how do i",
  "help",
  "guide",
  "app",
  "resource",
  "course",
  "pdf",
  "plan"
];

function splitTerms(value: string) {
  return value
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

function scoreSignal(text: string, signalTerms: string[]) {
  const haystack = text.toLowerCase();
  const matchedTerms = signalTerms.filter((term) => haystack.includes(term));
  const matchedIntentTerms = buyingIntentTerms.filter((term) =>
    haystack.includes(term)
  );

  const score = Math.min(
    98,
    45 + matchedTerms.length * 15 + matchedIntentTerms.length * 6
  );

  return {
    intentScore: score,
    matchedTerms
  };
}

function buildResponseDraft(offerName: string, title: string, matchedTerms: string[]) {
  const context = matchedTerms.length
    ? `I noticed you mentioned ${matchedTerms.slice(0, 2).join(" and ")}.`
    : "I noticed your question and wanted to respond with something practical.";

  return `${context} One helpful next step is to start with the smallest version of the solution: define the problem clearly, take one practical action today, and use a simple resource that keeps you consistent. I have a ${offerName} resource that may help if you want something more structured.`;
}

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
        author: data.author || "unknown",
        subreddit: data.subreddit || subreddit || "all",
        url: `https://www.reddit.com${data.permalink || ""}`,
        score: data.score || 0,
        comments: data.num_comments || 0,
        createdAt: data.created_utc
          ? new Date(data.created_utc * 1000).toISOString()
          : new Date().toISOString(),
        intentScore: scored.intentScore,
        matchedTerms: scored.matchedTerms,
        suggestedAction:
          scored.intentScore >= 80
            ? `High-intent signal for ${offerName}. Draft a value-first reply, then offer the resource if they engage.`
            : `Review for ${offerName}. It may be useful, but needs human judgment before outreach.`,
        responseDraft: buildResponseDraft(offerName, title, scored.matchedTerms)
      };
    });

    return NextResponse.json({
      ok: true,
      query,
      scannedAt: new Date().toISOString(),
      signals
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
