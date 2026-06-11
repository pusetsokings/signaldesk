/**
 * Platform connectors shared by the on-demand scan endpoint and the
 * scheduled watchlist scanner. Hacker News, Bluesky, and Mastodon expose
 * public APIs that need no credentials; Reddit joins automatically once
 * REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET are configured.
 */

export type RawSignal = {
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

const USER_AGENT = "SignalDesk/0.1 by Brandlytics";

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
    headers: { "User-Agent": USER_AGENT },
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
    headers: { "User-Agent": USER_AGENT },
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
    headers: { "User-Agent": USER_AGENT },
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

async function fetchReddit(query: string, limit: number) {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Reddit scans need REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (pending Reddit app approval)."
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT
    },
    body: "grant_type=client_credentials",
    cache: "no-store"
  });
  if (!tokenResponse.ok) {
    throw new Error(`Reddit auth returned ${tokenResponse.status}.`);
  }
  const token = (await tokenResponse.json()) as { access_token: string };

  const response = await fetch(
    `https://oauth.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "User-Agent": USER_AGENT
      },
      next: { revalidate: 60 }
    }
  );
  if (!response.ok) {
    throw new Error(`Reddit search returned ${response.status}.`);
  }

  const payload = (await response.json()) as {
    data?: {
      children?: Array<{
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
      }>;
    };
  };

  return (payload.data?.children || []).map(({ data }): RawSignal => ({
    id: `reddit-${data.id}`,
    title: data.title || "Reddit post",
    text: data.selftext || "",
    author: data.author || "unknown",
    sourceLabel: `Reddit / r/${data.subreddit || "all"}`,
    url: `https://www.reddit.com${data.permalink || ""}`,
    profileUrl: `https://www.reddit.com/user/${data.author || ""}`,
    score: data.score || 0,
    comments: data.num_comments || 0,
    createdAt: data.created_utc
      ? new Date(data.created_utc * 1000).toISOString()
      : new Date().toISOString()
  }));
}

export const PLATFORM_FETCHERS: Record<
  string,
  (query: string, limit: number) => Promise<RawSignal[]>
> = {
  hackernews: fetchHackerNews,
  bluesky: fetchBluesky,
  mastodon: fetchMastodon,
  reddit: fetchReddit
};

export function supportedPlatforms() {
  return Object.keys(PLATFORM_FETCHERS);
}
