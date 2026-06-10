# SignalDesk Go-Live Checklist

Goal: from "Run live Reddit scan" click to a qualified lead in Brandlytics CRM.

The code path is complete: Reddit search -> AI classification + per-signal
draft -> edit/approve -> push to CRM. What remains are credentials and one
CRM-side endpoint. Each item below can only be done by the account owner.

## 1. Reddit API credentials (required — 5 minutes)

1. Go to https://www.reddit.com/prefs/apps while logged in.
2. Click "create another app", choose type **script**.
3. Name: `SignalDesk`. Redirect URI: `http://localhost` (unused).
4. Copy the client ID (under the app name) and the secret.
5. In Vercel -> signaldesk project -> Settings -> Environment Variables, add:
   - `REDDIT_CLIENT_ID`
   - `REDDIT_CLIENT_SECRET`

Without this, Reddit blocks anonymous search from Vercel with 403.

## 2. One AI engine key (required for real scoring — 5 minutes)

Add at least one of these in Vercel environment variables:

- `OPENAI_API_KEY` (recommended first: cheap, fast classification)
- `ANTHROPIC_API_KEY` (best drafting quality; default model `claude-opus-4-8`)
- `DEEPSEEK_API_KEY` (lowest cost bulk scoring)

Routing order is OpenAI -> Claude -> DeepSeek; override with
`ENGINE_PRIMARY`. With no key set, scans still work but fall back to
rule-based scoring and template drafts (clearly labeled in the UI).

## 3. Brandlytics CRM webhook (required for CRM push)

SignalDesk POSTs the lead payload from docs/CRM_SYNC_CONTRACT.md to
`BRANDLYTICS_CRM_WEBHOOK_URL` with `Authorization: Bearer <BRANDLYTICS_CRM_API_KEY>`.

1. In crm.brandlytics.agency, create an inbound webhook/endpoint that accepts
   that JSON payload and creates a lead (see the contract doc for the exact
   shape and expected response).
2. Add in Vercel:
   - `BRANDLYTICS_CRM_WEBHOOK_URL`
   - `BRANDLYTICS_CRM_API_KEY`

Until then, "Push to CRM" returns a clear "not configured" message instead of
pretending to work.

## 4. Redeploy

Environment variable changes require a redeploy:

```bash
vercel --prod
```

## 5. Custom domain DNS (optional but recommended)

At the DNS provider for brandlytics.agency add:

```text
A  signal  76.76.21.21
```

Then verify https://signal.brandlytics.agency resolves.

## 6. First-sale test run

1. Open the dashboard -> Run signal scan.
2. Offer: your real product (e.g. Prayer App). Query: a real demand phrase.
3. Confirm the engine badge shows an AI engine, not "rule-based".
4. Pick the highest-intent signal, edit the draft to sound like you, Approve.
5. Post the reply manually on Reddit (value-first; no link in first reply).
6. Push the lead to CRM and follow up there when they engage.

## What "hands-free at the click of a button" honestly means today

One click gets you: harvested signals, AI intent/urgency scores, a
ready-to-send reply per signal, and a one-click CRM push. By design (and by
Reddit's rules + the product's own ethics section), the final posting of the
reply stays human-approved — that approval click is what protects the
accounts from being banned as spam. The sale itself happens when the lead
engages and converts; SignalDesk's job is to put qualified, already-asking
buyers in front of you daily.

## Next build steps (after first leads flow)

1. Database-backed products/services profiles (Supabase) so "Run signal scan"
   uses saved offers instead of the live-test form.
2. Vercel cron for daily scheduled scans + daily brief email.
3. YouTube comments connector.
4. Multi-tenant workspaces so SignalDesk itself can be sold to clients.
