import type { SignalDeskAgentOutput } from "./types";

export const mockAgentRun: SignalDeskAgentOutput = {
  run: {
    id: "run_2026_06_07_001",
    started_at: "2026-06-07T08:00:00Z",
    completed_at: "2026-06-07T08:05:00Z",
    status: "completed"
  },
  signals_found: [
    {
      id: "signal_001",
      platform: "reddit",
      source_name: "r/PrayerRequests",
      source_url: "https://reddit.com/example",
      author: "example_user",
      text: "I don't know how to pray anymore and I need a way to become consistent again.",
      detected_location: null,
      location_mode: "global",
      matched_product_service_id: "product_prayer_app",
      intent_type: "pain",
      intent_score: 91,
      urgency_score: 67,
      summary:
        "A person is expressing discouragement and asking implicitly for prayer guidance."
    },
    {
      id: "signal_002",
      platform: "youtube",
      source_name: "Fasting video comment",
      source_url: "https://youtube.com/watch?v=example",
      author: "youtube_commenter",
      text: "Does anyone have a simple fasting plan for beginners? I always start and fail.",
      detected_location: null,
      location_mode: "global",
      matched_product_service_id: "product_fasting_pdf",
      intent_type: "education",
      intent_score: 86,
      urgency_score: 54,
      summary:
        "A person is asking for beginner fasting guidance and may be a fit for a simple fasting resource."
    },
    {
      id: "signal_003",
      platform: "linkedin",
      source_name: "Construction discussion",
      source_url: "https://linkedin.com/feed/update/example",
      author: "linkedin_member",
      text: "Looking for a reliable contractor in Gaborone for a small commercial renovation.",
      detected_location: "Gaborone, Botswana",
      location_mode: "location_targeted",
      matched_product_service_id: "service_construction_client",
      intent_type: "buying",
      intent_score: 94,
      urgency_score: 82,
      summary:
        "A high-intent local construction lead is asking for a contractor recommendation."
    }
  ],
  opportunities: [
    {
      signal_id: "signal_001",
      status: "new",
      recommended_action:
        "Reply publicly with encouragement and practical prayer structure. Avoid direct link in first reply.",
      crm_ready: true
    },
    {
      signal_id: "signal_002",
      status: "new",
      recommended_action:
        "Answer with a beginner-safe fasting structure and offer the PDF if they ask for the full plan.",
      crm_ready: true
    },
    {
      signal_id: "signal_003",
      status: "new",
      recommended_action:
        "Reply with a short qualification question and invite them to request a quote.",
      crm_ready: true
    }
  ],
  response_drafts: [
    {
      signal_id: "signal_001",
      type: "public_comment",
      tone: "gentle_helpful",
      text:
        "A simple restart is one honest sentence, one gratitude, and one specific request. Small prayers still count. If you want, I can share a simple rhythm that helps people stay consistent."
    },
    {
      signal_id: "signal_003",
      type: "public_comment",
      tone: "professional_helpful",
      text:
        "For a commercial renovation, ask for a scope visit, written quote, timeline, and references from similar jobs. I can connect you with a team that handles this in Gaborone."
    }
  ],
  crm_leads: [
    {
      signal_id: "signal_001",
      lead_name: "example_user",
      platform: "reddit",
      profile_url: "https://reddit.com/user/example_user",
      matched_offer: "Prayer App",
      intent_score: 91,
      recommended_action:
        "Offer prayer rhythm resource after engagement."
    },
    {
      signal_id: "signal_003",
      lead_name: "linkedin_member",
      platform: "linkedin",
      profile_url: "https://linkedin.com/in/example",
      matched_offer: "Construction Client",
      intent_score: 94,
      recommended_action:
        "Push to Brandlytics CRM as quote-request opportunity."
    }
  ],
  analytics_summary: {
    signals_found: 3,
    qualified_opportunities: 3,
    crm_ready_leads: 2,
    top_platform: "reddit"
  }
};

