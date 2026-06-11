import { Pool } from "pg";

/**
 * SignalDesk's own storage: watchlists and the persistent signal inbox.
 * Connects as a dedicated least-privilege Postgres user that can only
 * touch the sd_ tables.
 */

let pool: Pool | null = null;

function getPool() {
  const connectionString = process.env.SIGNALDESK_DATABASE_URL;
  if (!connectionString) {
    throw new Error("SIGNALDESK_DATABASE_URL is not configured.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 3,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30000
    });
  }
  return pool;
}

export function dbConfigured() {
  return Boolean(process.env.SIGNALDESK_DATABASE_URL);
}

export type Watchlist = {
  id: string;
  name: string;
  offer_name: string;
  query: string;
  signal_terms: string;
  platforms: string[];
  min_intent_score: number;
  crm_workspace_id: string | null;
  is_active: boolean;
  last_scanned_at: string | null;
  created_at: string;
};

export type StoredSignal = {
  id: string;
  watchlist_id: string | null;
  platform: string;
  title: string;
  text: string;
  author: string;
  url: string;
  profile_url: string;
  source_label: string;
  intent_score: number;
  intent_type: string;
  urgency_score: number;
  summary: string;
  matched_terms: string[];
  suggested_action: string;
  response_draft: string;
  engine: string;
  status: string;
  found_at: string;
  watchlist_name?: string | null;
  offer_name?: string | null;
  crm_workspace_id?: string | null;
};

export async function listWatchlists(): Promise<Watchlist[]> {
  const result = await getPool().query(
    "select * from sd_watchlists order by created_at desc"
  );
  return result.rows;
}

export async function getWatchlist(id: string): Promise<Watchlist | null> {
  const result = await getPool().query("select * from sd_watchlists where id = $1", [id]);
  return result.rows[0] || null;
}

export async function createWatchlist(input: {
  name: string;
  offerName: string;
  query: string;
  signalTerms: string;
  platforms: string[];
  minIntentScore: number;
  crmWorkspaceId?: string | null;
}): Promise<Watchlist> {
  const result = await getPool().query(
    `insert into sd_watchlists
       (name, offer_name, query, signal_terms, platforms, min_intent_score, crm_workspace_id)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning *`,
    [
      input.name,
      input.offerName,
      input.query,
      input.signalTerms,
      input.platforms,
      input.minIntentScore,
      input.crmWorkspaceId || null
    ]
  );
  return result.rows[0];
}

export async function updateWatchlist(
  id: string,
  patch: Partial<{
    name: string;
    offer_name: string;
    query: string;
    signal_terms: string;
    platforms: string[];
    min_intent_score: number;
    crm_workspace_id: string | null;
    is_active: boolean;
    last_scanned_at: string;
  }>
): Promise<Watchlist | null> {
  const allowed = [
    "name",
    "offer_name",
    "query",
    "signal_terms",
    "platforms",
    "min_intent_score",
    "crm_workspace_id",
    "is_active",
    "last_scanned_at"
  ] as const;
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (key in patch) {
      values.push(patch[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (sets.length === 0) return getWatchlist(id);
  values.push(id);
  const result = await getPool().query(
    `update sd_watchlists set ${sets.join(", ")}, updated_at = now()
     where id = $${values.length} returning *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteWatchlist(id: string) {
  await getPool().query("delete from sd_watchlists where id = $1", [id]);
}

export async function existingSignalIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const result = await getPool().query(
    "select id from sd_signals where id = any($1)",
    [ids]
  );
  return new Set(result.rows.map((row: { id: string }) => row.id));
}

export async function insertSignals(
  rows: Array<Omit<StoredSignal, "status" | "found_at">>
): Promise<number> {
  let inserted = 0;
  for (const row of rows) {
    const result = await getPool().query(
      `insert into sd_signals
         (id, watchlist_id, platform, title, text, author, url, profile_url,
          source_label, intent_score, intent_type, urgency_score, summary,
          matched_terms, suggested_action, response_draft, engine)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       on conflict (id) do nothing`,
      [
        row.id,
        row.watchlist_id,
        row.platform,
        row.title,
        row.text,
        row.author,
        row.url,
        row.profile_url,
        row.source_label,
        row.intent_score,
        row.intent_type,
        row.urgency_score,
        row.summary,
        row.matched_terms,
        row.suggested_action,
        row.response_draft,
        row.engine
      ]
    );
    inserted += result.rowCount || 0;
  }
  return inserted;
}

export async function listInboxSignals(options: {
  status?: string;
  limit?: number;
}): Promise<StoredSignal[]> {
  const limit = Math.min(options.limit || 50, 200);
  const params: unknown[] = [];
  let where = "";
  if (options.status && options.status !== "all") {
    params.push(options.status);
    where = `where s.status = $${params.length}`;
  }
  params.push(limit);
  const result = await getPool().query(
    `select s.*, w.name as watchlist_name, w.offer_name, w.crm_workspace_id
     from sd_signals s
     left join sd_watchlists w on w.id = s.watchlist_id
     ${where}
     order by s.intent_score desc, s.found_at desc
     limit $${params.length}`,
    params
  );
  return result.rows;
}

export async function updateSignal(
  id: string,
  patch: Partial<{ status: string; response_draft: string; notified: boolean }>
): Promise<StoredSignal | null> {
  const allowed = ["status", "response_draft", "notified"] as const;
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (key in patch) {
      values.push(patch[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (sets.length === 0) return null;
  values.push(id);
  const result = await getPool().query(
    `update sd_signals set ${sets.join(", ")}, updated_at = now()
     where id = $${values.length} returning *`,
    values
  );
  return result.rows[0] || null;
}

export async function inboxCounts(): Promise<Record<string, number>> {
  const result = await getPool().query(
    "select status, count(*)::int as count from sd_signals group by status"
  );
  const counts: Record<string, number> = {};
  for (const row of result.rows as Array<{ status: string; count: number }>) {
    counts[row.status] = row.count;
  }
  return counts;
}
