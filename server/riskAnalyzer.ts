import { RISK_CATEGORIES, type RiskCategory, type SeverityLevel } from "@shared/schema";

interface ExtractedRisk {
  title: string;
  description: string;
  category: RiskCategory;
  severity: SeverityLevel;
  affectedSystem: string;
  mitigationSuggestion: string;
}

// IBM Granite framework keyword mappings (pp. 7–11)
// https://www.ibm.com/granite/docs/resources/ai-agents-opportunities-risks-and-mitigations.pdf
const CATEGORY_KEYWORDS: Record<RiskCategory, string[]> = {
  "Value Alignment": [
    "alignment", "misaligned", "value alignment", "ethical", "unethical", "goal mispecification",
    "reward hacking", "corrigibility", "human values", "moral", "policy violation",
    "guidelines violation", "unsafe behavior", "unintended action", "off-policy",
    "goal drift", "instrumental goal", "side effect", "undesired outcome", "value conflict",
    "override", "autonomous decision", "agent objective", "principal hierarchy",
    "instruction following", "disobey", "defy", "unsafe action", "harmful action",
  ],
  "Fairness": [
    "bias", "fairness", "discrimination", "disparate", "inequity", "racial", "gender",
    "demographic", "stereotype", "representation", "diversity", "protected class",
    "unequal treatment", "unfair advantage", "data bias", "training bias", "feedback loop",
    "underrepresented", "minority", "equity", "inclusion", "prejudice", "skew",
    "disparate impact", "algorithmic bias", "audit bias", "model bias",
  ],
  "Misplaced Trust": [
    "overtrust", "over-reliance", "under-reliance", "misplaced trust", "automation bias",
    "complacency", "trust calibration", "human oversight", "verification", "reliance",
    "anthropomorphize", "hallucination trust", "credibility", "false confidence",
    "skepticism", "critical thinking", "user trust", "dependency", "overconfidence",
    "blind trust", "overestimate", "underestimate capability", "cheat detection",
  ],
  "Computation Inefficiency": [
    "inefficiency", "redundant", "wasteful", "infinite loop", "loop", "repeated action",
    "resource waste", "token waste", "compute cost", "latency", "timeout", "stuck",
    "cycle", "runaway", "repeated call", "unnecessary step", "overcomputation",
    "token usage", "cost overrun", "excessive call", "retry loop", "agent loop",
    "re-execution", "duplicate", "over-planning", "unnecessary tool call",
  ],
  "Robustness": [
    "adversarial", "attack", "prompt injection", "jailbreak", "exploit", "vulnerability",
    "manipulation", "hijack", "unauthorized", "trust mismatch", "function-calling hallucination",
    "tool hallucination", "poisoning", "backdoor", "red team", "adversarial input",
    "robustness", "security", "evasion", "spoofing", "bypass", "subversion",
    "malicious input", "injection", "corrupted", "hacking", "cyberattack",
    "supply chain", "third-party risk", "tool misuse", "API abuse",
  ],
  "Privacy and IP": [
    "privacy", "intellectual property", "IP", "confidential", "personal information",
    "PII", "data leak", "data breach", "sensitive data", "exfiltration", "exposure",
    "GDPR", "HIPAA", "data protection", "consent", "surveillance", "tracking",
    "personal data", "proprietary", "trade secret", "copyright", "memorization",
    "training data leak", "membership inference", "data minimization", "retention",
  ],
  "Explainability and Transparency": [
    "explainability", "transparency", "interpretability", "black box", "opaque",
    "unexplainable", "untraceable", "audit trail", "logging", "traceability",
    "documentation", "accountability", "disclosure", "insight", "inner working",
    "reasoning trace", "chain of thought", "decision explanation", "model card",
    "watermark", "provenance", "attribution", "explainable AI", "XAI", "LIME", "SHAP",
    "multi-agent interaction", "agent interaction log", "intermediate step",
  ],
  "Challenges": [
    "evaluation", "benchmark", "mitigation", "maintenance", "reproducibility",
    "accountability", "compliance", "regulation", "testing", "red-team", "auditing",
    "governance", "framework", "standard", "certification", "EU AI Act", "NIST",
    "policy", "legislation", "liability", "risk management", "monitoring", "observability",
    "drift", "performance degradation", "update", "versioning", "rollback",
    "incident response", "contingency", "safeguard", "guardrail",
  ],
  "Societal Impact": [
    "societal", "society", "human dignity", "human agency", "job", "employment",
    "workforce", "automation", "displacement", "inequality", "environment",
    "carbon footprint", "energy consumption", "sustainability", "democracy",
    "election", "misinformation", "disinformation", "polarization", "manipulation",
    "concentration of power", "monopoly", "access", "digital divide", "wellbeing",
    "mental health", "addiction", "dependency", "social norm", "cultural impact",
  ],
};

const SEVERITY_KEYWORDS: Record<SeverityLevel, string[]> = {
  critical: [
    "catastrophic", "critical", "existential", "weapon", "critical infrastructure",
    "large-scale", "irreversible", "widespread", "mass casualty", "systemic collapse",
    "total failure", "uncontrolled", "severe breach", "complete loss",
  ],
  high: [
    "significant", "serious", "major", "substantial", "dangerous", "harmful",
    "severe", "high-stakes", "widespread harm", "large scale", "systemic",
    "financial loss", "data breach", "personal harm", "discrimination",
  ],
  medium: [
    "moderate", "concerning", "potential", "emerging", "notable", "problematic",
    "risks", "issues", "challenges", "vulnerabilities", "inefficiency",
  ],
  low: [
    "minor", "limited", "marginal", "theoretical", "hypothetical",
    "speculative", "small-scale", "contained", "edge case",
  ],
};

const SYSTEM_KEYWORDS: Record<string, string[]> = {
  "LLM Agents": ["language model", "LLM", "GPT", "Claude", "Gemini", "chatbot", "conversational AI", "large language"],
  "Multi-Agent Systems": ["multi-agent", "agent swarm", "agent network", "orchestrat", "agent collaboration", "agent pipeline"],
  "Autonomous Vehicles": ["self-driving", "autonomous vehicle", "AV", "robotaxi", "autopilot"],
  "AI in Healthcare": ["medical AI", "diagnostic AI", "clinical AI", "radiology AI", "drug discovery", "healthcare AI"],
  "AI in Finance": ["fintech", "algorithmic trading", "credit scoring", "fraud detection", "financial AI"],
  "Foundation Models": ["foundation model", "base model", "frontier model", "large model", "generative AI"],
  "Robotics": ["robot", "robotic", "physical AI", "embodied AI", "manipulation"],
  "AI Infrastructure": ["data center", "compute", "GPU cluster", "training infrastructure", "API", "cloud AI"],
  "General AI Systems": ["AI system", "artificial intelligence", "machine learning", "deep learning", "agentic AI"],
};

function countKeywordMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((n, kw) => n + (lower.includes(kw.toLowerCase()) ? 1 : 0), 0);
}

function detectCategory(title: string, summary: string): RiskCategory {
  const text = `${title} ${summary}`;
  let best: RiskCategory = "Robustness";
  let bestScore = 0;
  for (const cat of RISK_CATEGORIES) {
    const score = countKeywordMatches(text, CATEGORY_KEYWORDS[cat]);
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return best;
}

function detectSeverity(title: string, summary: string): SeverityLevel {
  const text = `${title} ${summary}`;
  for (const level of ["critical", "high", "medium", "low"] as SeverityLevel[]) {
    if (countKeywordMatches(text, SEVERITY_KEYWORDS[level]) > 0) return level;
  }
  return "medium";
}

function detectAffectedSystem(title: string, summary: string): string {
  const text = `${title} ${summary}`;
  for (const [system, kws] of Object.entries(SYSTEM_KEYWORDS)) {
    if (countKeywordMatches(text, kws) > 0) return system;
  }
  return "General AI Systems";
}

// IBM-aligned mitigation guidance per category
const MITIGATIONS: Record<RiskCategory, string> = {
  "Value Alignment": "Define explicit agent objectives and constraints; implement constitutional AI principles; apply RLHF with diverse human feedback; establish principal hierarchy with clear override mechanisms.",
  "Fairness": "Audit training data for representation gaps; establish fairness metrics across demographic groups; apply bias detection pipelines; conduct regular third-party fairness audits.",
  "Misplaced Trust": "Calibrate user expectations with clear capability disclosures; implement uncertainty quantification; require human verification checkpoints for high-stakes decisions; train users on appropriate reliance.",
  "Computation Inefficiency": "Implement action deduplication and loop detection; set hard budget limits on agent steps and token usage; monitor execution graphs for cycles; apply early-termination heuristics.",
  "Robustness": "Deploy prompt injection defenses and input sanitization; enforce tool-call validation; red-team agentic workflows; implement trust level controls for multi-agent communication.",
  "Privacy and IP": "Apply data minimization and purpose limitation; enforce access controls on tool inputs/outputs; scan agent outputs for PII before delivery; implement differential privacy where applicable.",
  "Explainability and Transparency": "Log all intermediate agent reasoning steps; expose chain-of-thought traces for audit; publish model cards; implement human-readable action summaries; maintain comprehensive audit trails.",
  "Challenges": "Establish structured evaluation benchmarks for agentic tasks; implement continuous monitoring with drift detection; maintain reproducibility through versioned agent configs; align with EU AI Act and NIST AI RMF.",
  "Societal Impact": "Conduct societal impact assessments before deployment; engage affected communities; establish transition support programs; monitor environmental resource usage; implement human agency safeguards.",
};

const CATEGORY_PREFIXES: Record<RiskCategory, string> = {
  "Value Alignment": "Alignment Risk:",
  "Fairness": "Fairness Risk:",
  "Misplaced Trust": "Trust Risk:",
  "Computation Inefficiency": "Efficiency Risk:",
  "Robustness": "Robustness Risk:",
  "Privacy and IP": "Privacy Risk:",
  "Explainability and Transparency": "Transparency Risk:",
  "Challenges": "Governance Challenge:",
  "Societal Impact": "Societal Risk:",
};

export function analyzeArticleForRisks(
  articleId: number,
  title: string,
  summary: string | null | undefined,
): ExtractedRisk[] {
  const text = `${title} ${summary ?? ""}`;

  // Score every IBM category
  const scored = RISK_CATEGORIES.map(cat => ({
    category: cat as RiskCategory,
    score: countKeywordMatches(text, CATEGORY_KEYWORDS[cat]),
  })).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  // Take top 2, fall back to Robustness if nothing matches
  const top = scored.slice(0, 2);
  if (top.length === 0) top.push({ category: "Robustness", score: 1 });

  return top.map(({ category }) => {
    const severity = detectSeverity(title, summary ?? "");
    const affectedSystem = detectAffectedSystem(title, summary ?? "");
    const shortTitle = title.length > 55 ? title.substring(0, 52) + "..." : title;

    // One-line description: extract the specific risk claim from the summary.
    // Strategy: find the first sentence that contains a category keyword or risk word,
    // then fall back to the first sentence, then to a trimmed summary.
    const riskSignalWords = [
      ...CATEGORY_KEYWORDS[category],
      "risk", "threat", "danger", "concern", "vulnerability", "attack", "failure",
      "harm", "impact", "issue", "problem", "challenge", "exploit", "misuse",
    ];
    let oneLiner = title;
    if (summary) {
      const cleaned = summary.replace(/\s+/g, " ").replace(/<[^>]+>/g, "").trim();
      // Split on sentence boundaries
      const sentences = cleaned.match(/[^.!?]+[.!?]+/g) ?? [cleaned];
      // Find the first sentence that mentions a risk signal
      const riskSentence = sentences.find(s =>
        riskSignalWords.some(kw => s.toLowerCase().includes(kw.toLowerCase()))
      );
      const chosen = (riskSentence ?? sentences[0] ?? cleaned).trim();
      oneLiner = chosen.length > 180 ? chosen.substring(0, 177) + "..." : chosen;
    }

    return {
      title: `${CATEGORY_PREFIXES[category]} ${shortTitle}`,
      description: oneLiner,
      category,
      severity,
      affectedSystem,
      mitigationSuggestion: MITIGATIONS[category],
    };
  });
}
