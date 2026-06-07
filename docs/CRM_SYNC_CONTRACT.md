# Brandlytics CRM Sync Contract

SignalDesk feeds qualified leads into `crm.brandlytics.agency`.

## Direction

SignalDesk -> Brandlytics CRM

## MVP Sync Trigger

A signal becomes CRM-ready when:

- Intent score is equal to or above the workspace threshold
- The signal matches a product/service
- The source URL is present
- The lead/person has a platform identity
- The signal is not blocked by compliance rules

## Lead Payload

```json
{
  "source": "SignalDesk",
  "workspace_id": "workspace_prayer_products",
  "platform": "reddit",
  "lead_name": "example_user",
  "profile_url": "https://reddit.com/user/example_user",
  "source_url": "https://reddit.com/example",
  "signal_text": "I need help with prayer consistency.",
  "matched_offer": "Prayer App",
  "matched_offer_id": "product_prayer_app",
  "intent_type": "need",
  "intent_score": 87,
  "urgency_score": 63,
  "location": "Global",
  "recommended_action": "Send prayer routine resource after a value-first reply.",
  "response_draft": "A suggested response goes here.",
  "status": "new_signal"
}
```

## Expected CRM Response

```json
{
  "ok": true,
  "crm_lead_id": "lead_123",
  "pipeline_id": "brandlytics_pipeline_default",
  "created_at": "2026-06-07T08:10:00Z"
}
```

