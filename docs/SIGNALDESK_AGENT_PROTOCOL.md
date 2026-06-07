# SignalDesk Agent Protocol

The agent protocol is the contract that allows Codex, Claude, OpenAI agents, or
future LLM systems to run SignalDesk without changing the dashboard.

The dashboard and database stay stable. The agent can improve over time.

## Agent Input

```json
{
  "workspace": {
    "id": "workspace_prayer_products",
    "name": "Prayer Products",
    "default_location_mode": "global"
  },
  "products_services": [
    {
      "id": "product_prayer_app",
      "name": "Prayer App",
      "type": "digital_product",
      "description": "A prayer support app for people who need structure, encouragement, and consistency.",
      "target_audience": ["Christians", "people seeking prayer support"],
      "problems_solved": ["inconsistent prayer", "not knowing how to pray", "spiritual discouragement"],
      "offer_url": "https://example.com/prayer-app",
      "location_mode": "global",
      "target_locations": [],
      "crm_pipeline_id": "brandlytics_pipeline_default"
    }
  ],
  "signal_rules": [
    {
      "id": "rule_prayer_need",
      "product_service_id": "product_prayer_app",
      "phrases": ["I need prayer", "how do I pray", "please pray for me"],
      "intent_types": ["need", "pain", "education"],
      "minimum_intent_score": 70
    }
  ],
  "platforms": ["reddit", "youtube"],
  "posting_mode": "draft_only",
  "crm_push_threshold": 80
}
```

## Agent Output

```json
{
  "run": {
    "id": "run_2026_06_07_001",
    "started_at": "2026-06-07T08:00:00Z",
    "completed_at": "2026-06-07T08:05:00Z",
    "status": "completed"
  },
  "signals_found": [
    {
      "id": "signal_001",
      "platform": "reddit",
      "source_name": "r/PrayerRequests",
      "source_url": "https://reddit.com/example",
      "author": "example_user",
      "text": "I don't know how to pray anymore.",
      "detected_location": null,
      "location_mode": "global",
      "matched_product_service_id": "product_prayer_app",
      "intent_type": "pain",
      "intent_score": 91,
      "urgency_score": 67,
      "summary": "A person is expressing discouragement and asking implicitly for prayer guidance."
    }
  ],
  "opportunities": [
    {
      "signal_id": "signal_001",
      "status": "new",
      "recommended_action": "Reply publicly with encouragement and practical prayer structure. Avoid direct link in first reply.",
      "crm_ready": true
    }
  ],
  "response_drafts": [
    {
      "signal_id": "signal_001",
      "type": "public_comment",
      "tone": "gentle_helpful",
      "text": "I'm sorry you're carrying that. A simple place to restart is one honest sentence to God, then one thing you're thankful for, then one specific request. Small prayers still count. If you want, I can share a simple prayer rhythm resource."
    }
  ],
  "crm_leads": [
    {
      "signal_id": "signal_001",
      "lead_name": "example_user",
      "platform": "reddit",
      "profile_url": "https://reddit.com/user/example_user",
      "matched_offer": "Prayer App",
      "intent_score": 91,
      "recommended_action": "Offer prayer rhythm resource after engagement."
    }
  ],
  "analytics_summary": {
    "signals_found": 1,
    "qualified_opportunities": 1,
    "crm_ready_leads": 1,
    "top_platform": "reddit"
  }
}
```

## Agent Rules

- Detect intent, not only keywords.
- Default to global harvesting unless location mode is enabled.
- Never auto-post in MVP unless the workspace setting explicitly allows it.
- Prefer value-first responses before product links.
- Respect platform rules and blocked communities.
- Push only high-intent leads to Brandlytics CRM.
- Store source URLs and reasoning so results can be audited.

