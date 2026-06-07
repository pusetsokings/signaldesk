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

## Engine Provider Variables

The LLM engine is connected through Vercel environment variables. The first
provider can be OpenAI, with other providers added as fallbacks or specialized
engines.

```text
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
PERPLEXITY_API_KEY=
DEEPSEEK_API_KEY=
```

MVP recommendation:

- Use OpenAI as the first primary engine for classification and draft generation.
- Add Claude as a second engine for careful longer-form reply drafting.
- Add Perplexity later for research/source enrichment.
- Add DeepSeek later for lower-cost bulk classification.

## Test Flow

1. Go to the Live Signal Test section.
2. Enter an offer, such as `Prayer App`.
3. Enter a query, such as `how do I pray`.
4. Enter signal terms, such as `need prayer, how do I pray, prayer routine`.
5. Run the scan.
6. Review each matched signal.
7. Use the per-signal draft approval area to edit, approve, or push the lead to
   Brandlytics CRM.

## Trigger

The main trigger is the `Run signal scan` action. In the MVP UI this jumps to
the Live Signal Test area. In the production workflow it should:

1. Load the product/service profile.
2. Run enabled source connectors.
3. Send candidate signals to the selected LLM engine.
4. Score intent and urgency.
5. Generate per-signal drafts.
6. Save opportunities.
7. Push qualified leads to Brandlytics CRM when approved.

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
