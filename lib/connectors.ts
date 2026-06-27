/**
 * Platform connectors shared by the on-demand scan endpoint and the
 * scheduled watchlist scanner. Hacker News, Bluesky, Mastodon, and Reddit
 * use public APIs that need no credentials. Set REDDIT_SESSION_COOKIE for
 * authenticated Reddit access (extract from rdt-cli credential.json).
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
  // Uses Reddit's public JSON API — no OAuth approval needed.
  // Optionally pass REDDIT_SESSION_COOKIE (from rdt-cli ~/.config/rdt-cli/credential.json)
  // for authenticated access with better rate limits.
  const sessionCookie = process.env.REDDIT_SESSION_COOKIE;

  const headers: HeadersInit = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json",
  };

  if (sessionCookie) {
    headers["Cookie"] = `reddit_session=${sessionCookie}`;
  }

  const response = await fetch(
    `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${limit}&type=link`,
    { headers, next: { revalidate: 60 } }
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

const NITTER_INSTANCES = [
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
  "https://nitter.net",
];

function parseNitterRSS(xml: string, limit: number): RawSignal[] {
  const items: RawSignal[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    if (items.length >= limit) break;
    const b = match[1];
    const cdata = (tag: string) =>
      b.match(new RegExp(`<${tag}><\\!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))?.[1] ??
      b.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] ?? "";
    const link = (cdata("link").trim() || b.match(/<link\/>([\s\S]*?)<title/)?.[1]?.trim()) ?? "";
    const tweetId = link.match(/\/status\/(\d+)/)?.[1];
    if (!tweetId) continue;
    const username = link.match(/\/([^/]+)\/status/)?.[1] ?? cdata("dc:creator").replace(/^@/, "") ?? "unknown";
    items.push({
      id: `tw-${tweetId}`,
      title: stripHtml(cdata("title")).slice(0, 120) || "Tweet",
      text: stripHtml(cdata("description")) || stripHtml(cdata("title")),
      author: username,
      sourceLabel: "Twitter/X",
      url: `https://twitter.com/${username}/status/${tweetId}`,
      profileUrl: `https://twitter.com/${username}`,
      score: 0,
      comments: 0,
      createdAt: (() => { try { return new Date(cdata("pubDate")).toISOString(); } catch { return new Date().toISOString(); } })(),
    });
  }
  return items;
}

async function fetchTwitter(query: string, limit: number): Promise<RawSignal[]> {
  let lastError: Error = new Error("All Nitter instances failed.");
  for (const base of NITTER_INSTANCES) {
    try {
      const url = `${base}/search/rss?q=${encodeURIComponent(query)}&f=tweets`;
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 60 },
      });
      if (!response.ok) continue;
      const items = parseNitterRSS(await response.text(), limit);
      if (items.length > 0) return items;
    } catch (e) {
      lastError = e as Error;
    }
  }
  throw lastError;
}

async function fetchYouTube(query: string, limit: number) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error(
      "YouTube scans need YOUTUBE_API_KEY (free from Google Cloud Console)."
    );
  }

  const searchUrl =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date` +
    `&maxResults=5&q=${encodeURIComponent(query)}&key=${key}`;
  const searchResponse = await fetch(searchUrl, { next: { revalidate: 300 } });
  if (!searchResponse.ok) {
    throw new Error(`YouTube search returned ${searchResponse.status}.`);
  }
  const search = (await searchResponse.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: { title?: string; description?: string; channelTitle?: string; publishedAt?: string };
    }>;
  };

  const videos = (search.items || []).filter((item) => item.id?.videoId);
  const signals: RawSignal[] = [];

  // Comments under matching videos are where buying intent lives.
  for (const video of videos.slice(0, 4)) {
    const videoId = video.id!.videoId!;
    const videoTitle = video.snippet?.title || "YouTube video";
    try {
      const commentsUrl =
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&order=relevance` +
        `&maxResults=8&videoId=${videoId}&key=${key}`;
      const commentsResponse = await fetch(commentsUrl, { next: { revalidate: 300 } });
      if (!commentsResponse.ok) continue; // comments disabled or restricted
      const comments = (await commentsResponse.json()) as {
        items?: Array<{
          id: string;
          snippet?: {
            topLevelComment?: {
              snippet?: {
                textOriginal?: string;
                authorDisplayName?: string;
                authorChannelUrl?: string;
                likeCount?: number;
                publishedAt?: string;
              };
            };
            totalReplyCount?: number;
          };
        }>;
      };
      for (const thread of comments.items || []) {
        const comment = thread.snippet?.topLevelComment?.snippet;
        if (!comment?.textOriginal) continue;
        signals.push({
          id: `yt-${thread.id}`,
          title: `Comment on: ${videoTitle}`.slice(0, 120),
          text: comment.textOriginal,
          author: comment.authorDisplayName || "unknown",
          sourceLabel: "YouTube comments",
          url: `https://www.youtube.com/watch?v=${videoId}&lc=${thread.id}`,
          profileUrl: comment.authorChannelUrl || `https://www.youtube.com/watch?v=${videoId}`,
          score: comment.likeCount || 0,
          comments: thread.snippet?.totalReplyCount || 0,
          createdAt: comment.publishedAt || new Date().toISOString()
        });
        if (signals.length >= limit) break;
      }
    } catch {
      continue;
    }
    if (signals.length >= limit) break;
  }

  // Fallback: if no comments were readable, surface the videos themselves.
  if (signals.length === 0) {
    for (const video of videos) {
      signals.push({
        id: `ytv-${video.id!.videoId!}`,
        title: video.snippet?.title || "YouTube video",
        text: video.snippet?.description || "",
        author: video.snippet?.channelTitle || "unknown",
        sourceLabel: "YouTube",
        url: `https://www.youtube.com/watch?v=${video.id!.videoId!}`,
        profileUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
          video.snippet?.channelTitle || ""
        )}`,
        score: 0,
        comments: 0,
        createdAt: video.snippet?.publishedAt || new Date().toISOString()
      });
    }
  }

  return signals.slice(0, limit);
}

export const PLATFORM_FETCHERS: Record<
  string,
  (query: string, limit: number) => Promise<RawSignal[]>
> = {
  hackernews: fetchHackerNews,
  bluesky: fetchBluesky,
  mastodon: fetchMastodon,
  reddit: fetchReddit,
  twitter: fetchTwitter,
  youtube: fetchYouTube
};

export function supportedPlatforms() {
  return Object.keys(PLATFORM_FETCHERS);
}
