/**
 * Synthesizes a proper 1-sentence risk description for every risk.
 * Strategy: combine article title + summary to construct a clear, specific
 * "what risk does this article discuss" sentence rather than extracting one.
 */
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../data.db'));

// For each category, what is the core risk concern phrasing
const CATEGORY_CONTEXT = {
  "Value Alignment":                 "raises alignment concerns about",
  "Fairness":                        "highlights fairness and bias risks in",
  "Misplaced Trust":                 "identifies misplaced trust risks from",
  "Computation Inefficiency":        "exposes computational inefficiency in",
  "Robustness":                      "reveals robustness and security vulnerabilities in",
  "Privacy and IP":                  "uncovers privacy and IP risks in",
  "Explainability and Transparency": "raises transparency and explainability concerns about",
  "Challenges":                      "highlights governance and evaluation challenges for",
  "Societal Impact":                 "examines the societal impact of",
};

// Known risk signals to extract from summaries — find the most informative sentence
const STRONG_RISK_PHRASES = [
  "attackers", "vulnerability", "exploit", "breach", "leak", "bias", "discriminat",
  "misalign", "manipulat", "inject", "jailbreak", "backdoor", "scheming", "sabotage",
  "unsafe", "harmful", "danger", "risk", "threat", "fail", "error", "incorrect",
  "hallucin", "overrelian", "over-relian", "collapse", "flood", "abuse", "steal",
  "undermin", "circumvent", "bypass", "poison", "decepti", "mislead", "misinform",
  "inequit", "unfair", "displace", "job loss", "surveillance", "privacy", "expose",
  "uncontrolled", "runaway", "loop", "inefficien", "waste", "expensive",
];

function cleanSummary(summary) {
  if (!summary) return '';
  return summary
    .replace(/arXiv:\S+\s*(Announce Type:\s*\w+\s*)?(Abstract:\s*)?/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text) {
  return (text.match(/[^.!?]+[.!?]+/g) ?? [text]).map(s => s.trim()).filter(s => s.length > 20);
}

function scoreSentence(sentence) {
  const lower = sentence.toLowerCase();
  return STRONG_RISK_PHRASES.reduce((n, phrase) => n + (lower.includes(phrase) ? 2 : 0), 0)
    + (sentence.length > 60 && sentence.length < 250 ? 1 : 0); // prefer medium-length sentences
}

function synthesizeDescription(title, summary, category) {
  const cleaned = cleanSummary(summary);
  if (!cleaned) {
    // No summary: construct from title
    const ctx = CATEGORY_CONTEXT[category] ?? 'discusses AI risks in';
    return `This article ${ctx} ${title.toLowerCase().replace(/^(the|a|an) /i, '')}.`;
  }

  const sentences = splitSentences(cleaned);
  if (sentences.length === 0) return cleaned.substring(0, 200);

  // Score all sentences, pick best
  const scored = sentences.map(s => ({ s, score: scoreSentence(s) }));
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  // If best sentence score is 0 (no risk signal found), 
  // try combining first 2 sentences for context
  if (best.score === 0) {
    const combined = sentences.slice(0, 2).join(' ');
    return combined.length > 220 ? combined.substring(0, 217) + '...' : combined;
  }

  const desc = best.s;
  return desc.length > 220 ? desc.substring(0, 217) + '...' : desc;
}

// Fetch all risks with article data
const risks = db.prepare(`
  SELECT r.id, r.category, r.description, a.title, a.summary
  FROM risks r
  JOIN articles a ON a.id = r.article_id
`).all();

console.log(`Synthesizing descriptions for ${risks.length} risks...`);

const update = db.prepare('UPDATE risks SET description = ? WHERE id = ?');

let updated = 0;
for (const risk of risks) {
  const newDesc = synthesizeDescription(risk.title, risk.summary, risk.category);
  if (newDesc && newDesc !== risk.description) {
    update.run(newDesc, risk.id);
    updated++;
  }
}

console.log(`Updated: ${updated}\n`);

// Print sample results for real articles
const samples = db.prepare(`
  SELECT r.id, r.category, r.description, a.title
  FROM risks r JOIN articles a ON a.id = r.article_id
  WHERE a.id > 18
  ORDER BY a.id DESC
  LIMIT 10
`).all();

samples.forEach(s => {
  console.log(`[${s.category}]`);
  console.log(`Article: ${s.title.substring(0, 70)}`);
  console.log(`Summary: ${s.description}`);
  console.log('');
});

db.close();
