import Anthropic from "@anthropic-ai/sdk";

/**
 * SignalDesk engine layer.
 *
 * Implements the SignalDesk Agent Protocol (docs/SIGNALDESK_AGENT_PROTOCOL.md):
 * candidate signals go in, classified opportunities with per-signal response
 * drafts come out. The provider is replaceable: OpenAI first, Claude second,
 * DeepSeek third, with a rule-based fallback so the product never hard-fails
 * when no key is configured.
 */

export type EngineCandidate = {
  id: string;
  title: string;
  text: string;
  author: string;
  source: string;
  url: string;
};

export type EngineClassification = {
  id: string;
  intentType: string;
  intentScore: number;
  urgencyScore: number;
  summary: string;
  suggestedAction: string;
  responseDraft: string;
};

export type EngineResult = {
  engine: "openai" | "anthropic" | "deepseek" | "rule-based";
  classifications: EngineClassification[];
};

export type OfferContext = {
  offerName: string;
  offerDescription?: string;
  signalTerms: string[];
};

const INTENT_TYPES = [
  "need",
  "pain",
  "buying",
  "complaint",
  "recommendation_request",
  "education",
  "influencer",
  "trend",
  "none"
] as const;

const CLASSIFICATION_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          intent_type: { type: "string", enum: [...INTENT_TYPES] },
          intent_score: { type: "integer" },
          urgency_score: { type: "integer" },
          summary: { type: "string" },
          suggested_action: { type: "string" },
          response_draft: { type: "string" }
        },
        required: [
          "id",
          "intent_type",
          "intent_score",
          "urgency_score",
          "summary",
          "suggested_action",
          "response_draft"
        ],
        additionalProperties: false
      }
    }
  },
  required: ["results"],
  additionalProperties: false
} as const;

function buildSystemPrompt() {
  return [
    "You are the SignalDesk classification engine for Brandlytics.",
    "You analyze public social posts and decide whether each one is a real demand signal for a given offer.",
    "Rules:",
    `- intent_type must be exactly one of: ${INTENT_TYPES.join(", ")}.`,
    "- Detect intent, not just keywords. A post can match terms but have no intent (score it low, intent_type 'none').",
    "- intent_score is 0-100: how strongly the person is expressing a need the offer can solve.",
    "- urgency_score is 0-100: how time-sensitive their situation appears.",
    "- summary is one sentence describing what the person needs.",
    "- suggested_action is one concrete next step for the operator.",
    "- response_draft is a reply the operator could post: value-first, genuinely helpful, written like a real person.",
    "  It must lead with practical help. It may softly mention that a resource exists, but must never read like an ad,",
    "  never include links, and never pressure the person. Match the emotional register of the post.",
    "Return one result per candidate, preserving the candidate id."
  ].join("\n");
}

function buildUserPrompt(offer: OfferContext, candidates: EngineCandidate[]) {
  return JSON.stringify(
    {
      offer: {
        name: offer.offerName,
        description: offer.offerDescription || "",
        signal_terms: offer.signalTerms
      },
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        source: candidate.source,
        title: candidate.title,
        text: candidate.text
      }))
    },
    null,
    2
  );
}

function clampScore(value: unknown) {
  const num = Math.round(Number(value));
  if (!Number.isFinite(num)) return 0;
  return Math.min(100, Math.max(0, num));
}

function normalizeResults(
  raw: unknown,
  candidates: EngineCandidate[]
): EngineClassification[] | null {
  const results = (raw as { results?: unknown[] })?.results;
  if (!Array.isArray(results)) return null;

  const byId = new Map<string, Record<string, unknown>>();
  for (const item of results) {
    if (item && typeof item === "object" && "id" in item) {
      byId.set(String((item as Record<string, unknown>).id), item as Record<string, unknown>);
    }
  }

  return candidates.map((candidate) => {
    const item = byId.get(candidate.id);
    if (!item) {
      return {
        id: candidate.id,
        intentType: "none",
        intentScore: 0,
        urgencyScore: 0,
        summary: "The engine did not return a classification for this signal.",
        suggestedAction: "Review manually.",
        responseDraft: ""
      };
    }
    const intentType = String(item.intent_type || "none");
    return {
      id: candidate.id,
      intentType: (INTENT_TYPES as readonly string[]).includes(intentType)
        ? intentType
        : "none",
      intentScore: clampScore(item.intent_score),
      urgencyScore: clampScore(item.urgency_score),
      summary: String(item.summary || ""),
      suggestedAction: String(item.suggested_action || ""),
      responseDraft: String(item.response_draft || "")
    };
  });
}

async function classifyWithOpenAICompatible(
  provider: "openai" | "deepseek",
  offer: OfferContext,
  candidates: EngineCandidate[]
): Promise<EngineClassification[] | null> {
  const apiKey =
    provider === "openai"
      ? process.env.OPENAI_API_KEY
      : process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const baseUrl =
    provider === "openai"
      ? "https://api.openai.com/v1/chat/completions"
      : "https://api.deepseek.com/chat/completions";
  const model =
    provider === "openai"
      ? process.env.OPENAI_MODEL || "gpt-4o-mini"
      : process.env.DEEPSEEK_MODEL || "deepseek-chat";

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            buildSystemPrompt() +
            '\nRespond with a JSON object of the shape {"results": [{"id", "intent_type", "intent_score", "urgency_score", "summary", "suggested_action", "response_draft"}]}.'
        },
        { role: "user", content: buildUserPrompt(offer, candidates) }
      ]
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`${provider} returned ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;

  return normalizeResults(JSON.parse(content), candidates);
}

async function classifyWithAnthropic(
  offer: OfferContext,
  candidates: EngineCandidate[]
): Promise<EngineClassification[] | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
    max_tokens: 8000,
    system: buildSystemPrompt(),
    output_config: {
      format: {
        type: "json_schema",
        schema: CLASSIFICATION_SCHEMA
      }
    },
    messages: [{ role: "user", content: buildUserPrompt(offer, candidates) }]
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;

  return normalizeResults(JSON.parse(textBlock.text), candidates);
}

const DEFAULT_CHAIN = ["openai", "anthropic", "deepseek"] as const;

export function configuredEngines() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    perplexity: Boolean(process.env.PERPLEXITY_API_KEY)
  };
}

/**
 * Classify candidates through the first available provider.
 * Returns null when no provider succeeds; the caller is expected to fall
 * back to rule-based scoring so the scan never hard-fails.
 */
export async function classifyCandidates(
  offer: OfferContext,
  candidates: EngineCandidate[]
): Promise<EngineResult | null> {
  if (candidates.length === 0) return null;

  const primary = (process.env.ENGINE_PRIMARY || "").toLowerCase();
  const chain = [...DEFAULT_CHAIN].sort((a, b) =>
    a === primary ? -1 : b === primary ? 1 : 0
  );

  for (const provider of chain) {
    try {
      const classifications =
        provider === "anthropic"
          ? await classifyWithAnthropic(offer, candidates)
          : await classifyWithOpenAICompatible(provider, offer, candidates);
      if (classifications) {
        return { engine: provider, classifications };
      }
    } catch (error) {
      console.error(`SignalDesk engine: ${provider} failed`, error);
    }
  }

  return null;
}
