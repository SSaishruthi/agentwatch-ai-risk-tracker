import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Risk categories from IBM Granite AI Agents: Opportunities, Risks, and Mitigations (pp. 7–11)
// https://www.ibm.com/granite/docs/resources/ai-agents-opportunities-risks-and-mitigations.pdf
export const RISK_CATEGORIES = [
  "Value Alignment",
  "Fairness",
  "Misplaced Trust",
  "Computation Inefficiency",
  "Robustness",
  "Privacy and IP",
  "Explainability and Transparency",
  "Challenges",
  "Societal Impact",
] as const;

export type RiskCategory = (typeof RISK_CATEGORIES)[number];

// IBM category descriptions for UI tooltips
export const RISK_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Value Alignment": "AI agents taking actions not aligned with human values, ethical considerations, guidelines, and policies.",
  "Fairness": "Discriminatory actions, unfair advantage of one group over another, and data bias introduced by AI agent actions.",
  "Misplaced Trust": "Over- or under-reliance on AI agents — users trusting the agent too much or not enough.",
  "Computation Inefficiency": "Redundant actions wasting computation resources, reducing efficiency, and potentially causing infinite loops.",
  "Robustness": "Attacks on AI agents' external resources, unauthorized use, trust mismatch exploits, and function-calling hallucination.",
  "Privacy and IP": "Sharing IP, personal information, or confidential data with users, tools, or other agents.",
  "Explainability and Transparency": "Unexplainable or untraceable actions, insufficient documentation, and lack of insight into agent workings.",
  "Challenges": "Evaluation, mitigation, maintenance, reproducibility, accountability, and compliance challenges for agentic AI.",
  "Societal Impact": "Impact on human dignity, human agency, jobs, and the environment.",
};

export const SEVERITY_LEVELS = ["critical", "high", "medium", "low"] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const SOURCE_TYPES = ["news", "research_paper", "blog", "report"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

// Articles ingested from news/research feeds
export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  source: text("source").notNull(),
  sourceType: text("source_type").notNull().default("news"),
  summary: text("summary"),
  content: text("content"),
  publishedAt: text("published_at"),
  fetchedAt: text("fetched_at").notNull(),
  processed: integer("processed", { mode: "boolean" }).default(false),
});

// Extracted risk signals from articles
export const risks = sqliteTable("risks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  articleId: integer("article_id").notNull().references(() => articles.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull().default("medium"),
  affectedSystem: text("affected_system"), // e.g. "LLM Agents", "Multi-agent systems"
  mitigationSuggestion: text("mitigation_suggestion"),
  createdAt: text("created_at").notNull(),
});

// Saved/bookmarked risks for governance teams
export const savedRisks = sqliteTable("saved_risks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  riskId: integer("risk_id").notNull().references(() => risks.id),
  notes: text("notes"),
  savedAt: text("saved_at").notNull(),
});

// Refresh log — tracks every feed fetch run
export const refreshLog = sqliteTable("refresh_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  triggeredBy: text("triggered_by").notNull().default("manual"), // "manual" | "scheduled"
  articlesAdded: integer("articles_added").notNull().default(0),
  risksExtracted: integer("risks_extracted").notNull().default(0),
  articlesFiltered: integer("articles_filtered").notNull().default(0), // skipped due to date filter
  errors: text("errors"), // JSON array
  ranAt: text("ran_at").notNull(),
  durationMs: integer("duration_ms"),
});

export const insertRefreshLogSchema = createInsertSchema(refreshLog).omit({ id: true });
export type InsertRefreshLog = z.infer<typeof insertRefreshLogSchema>;
export type RefreshLog = typeof refreshLog.$inferSelect;

// Feed sources configuration
export const feedSources = sqliteTable("feed_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  sourceType: text("source_type").notNull().default("news"),
  active: integer("active", { mode: "boolean" }).default(true),
  lastFetched: text("last_fetched"),
});

// Insert schemas
export const insertArticleSchema = createInsertSchema(articles).omit({ id: true });
export const insertRiskSchema = createInsertSchema(risks).omit({ id: true });
export const insertSavedRiskSchema = createInsertSchema(savedRisks).omit({ id: true });
export const insertFeedSourceSchema = createInsertSchema(feedSources).omit({ id: true });

// Types
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type InsertRisk = z.infer<typeof insertRiskSchema>;
export type InsertSavedRisk = z.infer<typeof insertSavedRiskSchema>;
export type InsertFeedSource = z.infer<typeof insertFeedSourceSchema>;

export type Article = typeof articles.$inferSelect;
export type Risk = typeof risks.$inferSelect;
export type SavedRisk = typeof savedRisks.$inferSelect;
export type FeedSource = typeof feedSources.$inferSelect;

// Enriched types for API responses
export type RiskWithArticle = Risk & {
  article: Article;
};

export type SavedRiskWithDetails = SavedRisk & {
  risk: Risk;
  article: Article;
};
