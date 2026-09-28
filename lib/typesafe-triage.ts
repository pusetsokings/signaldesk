import { choice, score, TypeSafeClient } from "@typesafe-ai/sdk";
import type { EngineCandidate, OfferContext } from "@/lib/engine";

/**
 * TypeSafe triage layer.
 *
 * Replaces the LLM's self-reported intent/urgency numbers with calibrated
 * judgments from TypeSafe's System One model (Jev). TypeSafe only judges; it
 * never writes text, so summaries and response drafts still come from the
 * LLM chain in engine.ts — and only for signals that pass triage.
 *
 * All-or-nothing by design: if any candidate fails, the whole batch returns
 * null and engine.ts falls back to the original LLM-only path unchanged.
 */

export type TriageResult = {
  intentType: string;
  intentScore: number;
  urgencyScore: number;
  intentConfidence: number;
};

const INTENT_CRITERIA = {
  need: "The person describes a need or goal that the offer could help them meet.",
  pain: "The person describes a problem or struggle they are experiencing, without yet asking for a solution.",
  buying: "The person is actively looking to buy, hire, or pay for a solution like the offer.",
  complaint: "The person is complaining about an existing product, service, or provider.",
  recommendation_request: "The person asks others to recommend a product, service, resource, or approach.",
  education: "The person wants to learn how to do something themselves.",
  influencer: "The author is a creator, expert, or brand sharing content with an audience rather than seeking help.",
  trend: "The post discusses a general trend, news, or opinion with no personal need expressed.",
  none: "No demand signal: off-topic, spam, promotion, or keyword match without any real need."
} as const;

// Ordered levels; mapped onto the existing 0-100 scale so hot-signal
// thresholds (>= 80, watchlist.min_intent_score) keep working.
const INTENT_LEVELS = [
  "No need the offer could address; the post only matches keywords or is unrelated.",
  "A loosely related topic, but no personal need is expressed.",
  "A personal need or problem the offer could plausibly help with, stated indirectly.",
  "A clear, personal need the offer directly addresses.",
  "An explicit request for a solution like the offer, with the person ready to act or asking where to get one."
] as const;

const URGENCY_LEVELS = [
  "No time pressure; general curiosity or a someday interest.",
  "Would like a solution eventually; no deadline mentioned.",
  "Wants a solution soon; mentions a near-term goal, event, or ongoing frustration.",
  "Needs a solution now; mentions a deadline, crisis, or something happening today or this week."
] as const;

function toPercent(value: number, levels: number) {
  return Math.round((value / (levels - 1)) * 100);
}

let client: TypeSafeClient | null = null;

export function typesafeConfigured() {
  return Boolean(process.env.TYPESAFE_API_KEY);
}

async function triageOne(
  offer: OfferContext,
  candidate: EngineCandidate
): Promise<TriageResult> {
  client ??= new TypeSafeClient();
  const response = await client.systemOne(
    {
      state: {
        offer: {
          name: offer.offerName,
          description: offer.offerDescription || "",
          signal_terms: offer.signalTerms
        },
        post: {
          source: candidate.source,
          title: candidate.title,
          text: candidate.text
        }
      },
      questions: {
        intent: choice(
          "What kind of demand signal is `post` for the business selling `offer`? Judge the author's actual intent, not keyword matches.",
          INTENT_CRITERIA
        ),
        intentStrength: score(
          "How strongly is the author of `post` expressing a need that `offer` could solve?",
          INTENT_LEVELS
        ),
        urgency: score(
          "How time-sensitive is the situation described in `post`?",
          URGENCY_LEVELS
        )
      }
    },
    { timeout: 15000 }
  );

  const { intent, intentStrength, urgency } = response.answers;
  return {
    intentType: intent.choice,
    intentScore: toPercent(intentStrength.score, INTENT_LEVELS.length),
    urgencyScore: toPercent(urgency.score, URGENCY_LEVELS.length),
    intentConfidence: intent.confidence
  };
}

/**
 * Judge every candidate with TypeSafe. Returns null when TypeSafe is not
 * configured or any request fails, so the caller can use the LLM-only path.
 */
export async function triageWithTypeSafe(
  offer: OfferContext,
  candidates: EngineCandidate[]
): Promise<Map<string, TriageResult> | null> {
  if (!typesafeConfigured() || candidates.length === 0) return null;

  try {
    const results = new Map<string, TriageResult>();
    const concurrency = 8;
    for (let i = 0; i < candidates.length; i += concurrency) {
      const batch = candidates.slice(i, i + concurrency);
      const judged = await Promise.all(batch.map((c) => triageOne(offer, c)));
      batch.forEach((c, index) => results.set(c.id, judged[index]));
    }
    return results;
  } catch (error) {
    console.error("SignalDesk engine: typesafe triage failed", error);
    return null;
  }
}
