export type LocationMode = "global" | "location_targeted";

export type SignalDeskAgentOutput = {
  run: {
    id: string;
    started_at: string;
    completed_at: string;
    status: "completed" | "failed" | "partial";
  };
  signals_found: Array<{
    id: string;
    platform: string;
    source_name: string;
    source_url: string;
    author: string;
    text: string;
    detected_location: string | null;
    location_mode: LocationMode;
    matched_product_service_id: string;
    intent_type: string;
    intent_score: number;
    urgency_score: number;
    summary: string;
  }>;
  opportunities: Array<{
    signal_id: string;
    status: "new" | "reviewed" | "pushed_to_crm" | "dismissed";
    recommended_action: string;
    crm_ready: boolean;
  }>;
  response_drafts: Array<{
    signal_id: string;
    type: string;
    tone: string;
    text: string;
  }>;
  crm_leads: Array<{
    signal_id: string;
    lead_name: string;
    platform: string;
    profile_url: string;
    matched_offer: string;
    intent_score: number;
    recommended_action: string;
  }>;
  analytics_summary: {
    signals_found: number;
    qualified_opportunities: number;
    crm_ready_leads: number;
    top_platform: string;
  };
};

