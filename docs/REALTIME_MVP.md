# SignalDesk Realtime MVP

## First Real Test

The first working connector should be Reddit because it has high-intent public
conversations and it maps directly to the pain point:

> Find buyers and interested people for apps, PDFs, and services.

## Required Vercel Environment Variables

Create a Reddit app, then add these to the Vercel project:

```text
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
```

SignalDesk uses Reddit's client-credentials OAuth flow for read-only public
search. Anonymous public JSON search may return `403`, so production should use
authenticated requests.

## Test Flow

1. Go to the Live Signal Test section.
2. Enter an offer, such as `Prayer App`.
3. Enter a query, such as `how do I pray`.
4. Enter signal terms, such as `need prayer, how do I pray, prayer routine`.
5. Run the scan.
6. Review each matched signal.
7. Use the per-signal draft approval area to edit, approve, or push the lead to
   Brandlytics CRM.

## Approval Flow

For each signal, SignalDesk should show:

- Source post
- Matched terms
- Intent score
- Suggested action
- Draft to approve
- Edit draft
- Approve
- Push to CRM

Auto-posting should remain disabled until the approval flow and platform rules
are mature.

