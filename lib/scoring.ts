/**
 * Rule-based fallback scoring used when no AI engine is configured.
 * Shared by the Reddit scan endpoint and the manual signal entry endpoint.
 */

export const buyingIntentTerms = [
  "need",
  "looking for",
  "recommend",
  "recommendation",
  "where can i",
  "how do i",
  "help",
  "guide",
  "app",
  "resource",
  "course",
  "pdf",
  "plan"
];

export function splitTerms(value: string) {
  return value
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

export function scoreSignal(text: string, signalTerms: string[]) {
  const haystack = text.toLowerCase();
  const matchedTerms = signalTerms.filter((term) => haystack.includes(term));
  const matchedIntentTerms = buyingIntentTerms.filter((term) =>
    haystack.includes(term)
  );

  const score = Math.min(
    98,
    45 + matchedTerms.length * 15 + matchedIntentTerms.length * 6
  );

  return {
    intentScore: score,
    matchedTerms
  };
}

export function buildResponseDraft(
  offerName: string,
  title: string,
  matchedTerms: string[]
) {
  const context = matchedTerms.length
    ? `I noticed you mentioned ${matchedTerms.slice(0, 2).join(" and ")}.`
    : "I noticed your question and wanted to respond with something practical.";

  return `${context} One helpful next step is to start with the smallest version of the solution: define the problem clearly, take one practical action today, and use a simple resource that keeps you consistent. I have a ${offerName} resource that may help if you want something more structured.`;
}
