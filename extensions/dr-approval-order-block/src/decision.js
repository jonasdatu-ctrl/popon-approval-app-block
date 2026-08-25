// Central table of known decision actions. Add an entry here (and a
// corresponding call site) to introduce a new action without touching
// any render logic - resolveDecisionTone() and buildDecisionSentence()
// both read from this table.
export const DECISION_ACTIONS = {
  Approved: { verb: "Approved", tone: "success" },
  Rejected: { verb: "Rejected", tone: "critical" },
};

const DEFAULT_TONE = "info";

export function buildDecisionSentence(actionKey, staffName, timestamp) {
  const action = DECISION_ACTIONS[actionKey];
  if (!action) {
    throw new Error(`Unknown decision action: ${actionKey}`);
  }

  const formattedTimestamp = timestamp.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${action.verb} by ${staffName} on ${formattedTimestamp}`;
}

export function resolveDecisionTone(decisionSentence) {
  const leadingVerb = decisionSentence.trim().split(" ")[0];
  const match = Object.values(DECISION_ACTIONS).find(
    (action) => action.verb === leadingVerb
  );
  return match ? match.tone : DEFAULT_TONE;
}
