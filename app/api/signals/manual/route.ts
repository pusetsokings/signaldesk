import { NextRequest, NextResponse } from "next/server";
import { classifyCandidates, type EngineCandidate } from "@/lib/engine";
import { buildResponseDraft, scoreSignal, splitTerms } from "@/lib/scoring";

type ManualSignalBody = {
  offerName?: string;
  signalTerms?: string;
  platform?: string;
  title?: string;
  text?: string;
  author?: string;
  url?: string;
};

export async function POST(request: NextRequest) {
  let body: ManualSignalBody;
  try {
    body = (await request.json()) as ManualSignalBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const text = body.text?.trim();
  const url = body.url?.trim();
  if (!text || !url) {
    return NextResponse.json(
      { ok: false, error: "text and url are required." },
      { status: 400 }
    );
  }

  const offerName = body.offerName?.trim() || "Configured offer";
  const platform = body.platform?.trim() || "manual";
  const title = body.title?.trim() || "";
  const author = body.author?.trim() || "unknown";
  const signalTerms = splitTerms(body.signalTerms || "");

  const scored = scoreSignal(`${title} ${text}`, signalTerms);
  const id = `manual-${Date.now()}`;

  const signal = {
    id,
    title: title || text.slice(0, 80),
    text: text.slice(0, 2000),
    author,
    url,
    intentScore: scored.intentScore,
    intentType: "need",
    urgencyScore: Math.max(0, scored.intentScore - 20),
    summary: "",
    matchedTerms: scored.matchedTerms,
    suggestedAction:
      scored.intentScore >= 80
        ? `High-intent signal for ${offerName}. Draft a value-first reply, then offer the resource if they engage.`
        : `Review for ${offerName}. It may be useful, but needs human judgment before outreach.`,
    responseDraft: buildResponseDraft(offerName, title, scored.matchedTerms)
  };

  let engine = "rule-based";
  const candidates: EngineCandidate[] = [
    {
      id: signal.id,
      title: signal.title,
      text: signal.text,
      author,
      source: platform,
      url
    }
  ];

  const result = await classifyCandidates({ offerName, signalTerms }, candidates);
  if (result) {
    engine = result.engine;
    const classified = result.classifications.find((item) => item.id === id);
    if (classified) {
      signal.intentScore = classified.intentScore;
      signal.intentType = classified.intentType;
      signal.urgencyScore = classified.urgencyScore;
      signal.summary = classified.summary;
      signal.suggestedAction = classified.suggestedAction;
      if (classified.responseDraft) signal.responseDraft = classified.responseDraft;
    }
  }

  return NextResponse.json({
    ok: true,
    engine,
    platform,
    signal
  });
}
