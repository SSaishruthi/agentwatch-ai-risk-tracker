/**
 * Reprocess all risk descriptions in-place using the improved sentence-extraction logic.
 * Finds the most risk-relevant sentence from the article summary for each risk.
 */
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../data.db'));

// IBM category keyword mappings (mirrors riskAnalyzer.ts)
const CATEGORY_KEYWORDS = {
  "Value Alignment": ["alignment","misaligned","value alignment","ethical","unethical","goal","reward hacking","corrigibility","human values","moral","policy violation","guidelines","unsafe","unintended","off-policy","goal drift","side effect","undesired","value conflict","override","autonomous","principal","instruction","disobey","defy","harmful action"],
  "Fairness": ["bias","fairness","discrimination","disparate","inequity","racial","gender","demographic","stereotype","representation","diversity","protected","unequal","unfair","data bias","feedback loop","underrepresented","minority","equity","inclusion","prejudice","skew","disparate impact","algorithmic bias"],
  "Misplaced Trust": ["overtrust","over-reliance","under-reliance","misplaced trust","automation bias","complacency","trust calibration","human oversight","verification","reliance","anthropomorphize","hallucination trust","credibility","false confidence","skepticism","dependency","overconfidence","blind trust"],
  "Computation Inefficiency": ["inefficiency","redundant","wasteful","infinite loop","loop","repeated action","resource waste","token waste","compute cost","latency","timeout","stuck","cycle","runaway","repeated call","unnecessary","overcomputation","cost overrun","excessive call","retry loop","re-execution","duplicate"],
  "Robustness": ["adversarial","attack","prompt injection","jailbreak","exploit","vulnerability","manipulation","hijack","unauthorized","function-calling hallucination","tool hallucination","poisoning","backdoor","red team","robustness","security","evasion","spoofing","bypass","subversion","malicious","injection","corrupted","hacking","cyberattack","supply chain","tool misuse","API abuse"],
  "Privacy and IP": ["privacy","intellectual property","confidential","personal information","PII","data leak","data breach","sensitive data","exfiltration","exposure","GDPR","HIPAA","data protection","consent","surveillance","tracking","proprietary","trade secret","copyright","memorization","training data leak","membership inference"],
  "Explainability and Transparency": ["explainability","transparency","interpretability","black box","opaque","unexplainable","untraceable","audit trail","logging","traceability","documentation","accountability","disclosure","reasoning trace","chain of thought","decision explanation","model card","watermark","provenance","attribution","XAI"],
  "Challenges": ["evaluation","benchmark","mitigation","maintenance","reproducibility","accountability","compliance","regulation","testing","red-team","auditing","governance","framework","standard","certification","EU AI Act","NIST","policy","legislation","liability","risk management","monitoring","observability","drift","incident response","safeguard","guardrail"],
  "Societal Impact": ["societal","society","human dignity","human agency","job","employment","workforce","automation","displacement","inequality","environment","carbon footprint","energy consumption","sustainability","democracy","election","misinformation","disinformation","polarization","manipulation","concentration of power","monopoly","access","digital divide","wellbeing","mental health","addiction"],
};

const RISK_SIGNAL_WORDS = ["risk","threat","danger","concern","vulnerability","attack","failure","harm","impact","issue","problem","challenge","exploit","misuse","breach","leak","bias","error","flaw","weakness"];

function extractBestSentence(summary, category) {
  if (!summary) return null;

  // Strip HTML tags and arXiv boilerplate
  let cleaned = summary
    .replace(/<[^>]+>/g, '')
    .replace(/arXiv:\S+\s*(Announce Type:\s*\w+\s*)?(Abstract:\s*)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into sentences
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) ?? [cleaned];

  // Score each sentence: category keyword hits + general risk signal hits
  const categoryKws = CATEGORY_KEYWORDS[category] ?? [];
  const allSignals = [...categoryKws, ...RISK_SIGNAL_WORDS];

  let bestSentence = null;
  let bestScore = -1;

  for (const s of sentences) {
    const lower = s.toLowerCase();
    const score = allSignals.reduce((n, kw) => n + (lower.includes(kw.toLowerCase()) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestSentence = s.trim();
    }
  }

  // Fall back to first non-boilerplate sentence
  const chosen = bestSentence ?? sentences[0]?.trim() ?? cleaned;
  return chosen.length > 200 ? chosen.substring(0, 197) + '...' : chosen;
}

// Fetch all risks with their article summaries
const risks = db.prepare(`
  SELECT r.id, r.category, r.description, a.summary
  FROM risks r
  JOIN articles a ON a.id = r.article_id
`).all();

console.log(`Reprocessing ${risks.length} risks...`);

const update = db.prepare('UPDATE risks SET description = ? WHERE id = ?');

let updated = 0;
let skipped = 0;

for (const risk of risks) {
  const newDesc = extractBestSentence(risk.summary, risk.category);
  if (!newDesc || newDesc === risk.description) { skipped++; continue; }
  update.run(newDesc, risk.id);
  updated++;
}

console.log(`Done. Updated: ${updated}, Skipped: ${skipped}`);

// Show sample results
const samples = db.prepare(`
  SELECT r.id, r.category, r.description, a.title
  FROM risks r JOIN articles a ON a.id = r.article_id
  WHERE r.id > 60 LIMIT 5
`).all();

samples.forEach(s => {
  console.log(`\n[${s.category}] ${s.title.substring(0,60)}`);
  console.log(`→ ${s.description}`);
});

db.close();
