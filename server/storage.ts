import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  articles, risks, savedRisks, feedSources, refreshLog,
  type Article, type Risk, type SavedRisk, type FeedSource, type RefreshLog,
  type InsertArticle, type InsertRisk, type InsertSavedRisk, type InsertFeedSource, type InsertRefreshLog,
  type RiskWithArticle, type SavedRiskWithDetails,
} from "@shared/schema";

const sqlite = new Database("data.db");
export const db = drizzle(sqlite);

// Initialize tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'news',
    summary TEXT,
    content TEXT,
    published_at TEXT,
    fetched_at TEXT NOT NULL,
    processed INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL REFERENCES articles(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    affected_system TEXT,
    mitigation_suggestion TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS saved_risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    risk_id INTEGER NOT NULL REFERENCES risks(id),
    notes TEXT,
    saved_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS refresh_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    triggered_by TEXT NOT NULL DEFAULT 'manual',
    articles_added INTEGER NOT NULL DEFAULT 0,
    risks_extracted INTEGER NOT NULL DEFAULT 0,
    articles_filtered INTEGER NOT NULL DEFAULT 0,
    errors TEXT,
    ran_at TEXT NOT NULL,
    duration_ms INTEGER
  );
  CREATE TABLE IF NOT EXISTS feed_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL DEFAULT 'news',
    active INTEGER DEFAULT 1,
    last_fetched TEXT
  );
`);

export interface IStorage {
  // Articles
  getArticles(limit?: number, offset?: number): Article[];
  getArticleById(id: number): Article | undefined;
  getUnprocessedArticles(): Article[];
  insertArticle(article: InsertArticle): Article;
  markArticleProcessed(id: number): void;
  articleExistsByUrl(url: string): boolean;

  // Risks
  getRisks(filters?: { category?: string; severity?: string }, limit?: number): RiskWithArticle[];
  getRiskById(id: number): RiskWithArticle | undefined;
  insertRisk(risk: InsertRisk): Risk;
  getRiskStats(): { category: string; count: number; severityBreakdown: Record<string, number> }[];
  getTotalRiskCount(): number;
  getRecentRisks(limit: number): RiskWithArticle[];

  // Saved Risks
  getSavedRisks(): SavedRiskWithDetails[];
  saveRisk(data: InsertSavedRisk): SavedRisk;
  unsaveRisk(riskId: number): void;
  isRiskSaved(riskId: number): boolean;
  updateSavedRiskNotes(id: number, notes: string): void;

  // Refresh Log
  insertRefreshLog(log: InsertRefreshLog): RefreshLog;
  getRefreshHistory(limit?: number): RefreshLog[];
  getLastRefresh(): RefreshLog | undefined;

  // Feed Sources
  getFeedSources(): FeedSource[];
  insertFeedSource(source: InsertFeedSource): FeedSource;
  updateFeedSourceLastFetched(id: number, timestamp: string): void;
  toggleFeedSource(id: number, active: boolean): void;
  deleteFeedSource(id: number): void;
}

class SqliteStorage implements IStorage {
  // Articles
  getArticles(limit = 50, offset = 0): Article[] {
    return db.select().from(articles).orderBy(desc(articles.fetchedAt)).limit(limit).offset(offset).all();
  }

  getArticleById(id: number): Article | undefined {
    return db.select().from(articles).where(eq(articles.id, id)).get();
  }

  getUnprocessedArticles(): Article[] {
    return db.select().from(articles).where(eq(articles.processed, false)).all();
  }

  insertArticle(article: InsertArticle): Article {
    return db.insert(articles).values(article).returning().get();
  }

  markArticleProcessed(id: number): void {
    db.update(articles).set({ processed: true }).where(eq(articles.id, id)).run();
  }

  articleExistsByUrl(url: string): boolean {
    const result = db.select({ id: articles.id }).from(articles).where(eq(articles.url, url)).get();
    return !!result;
  }

  // Risks
  getRisks(filters?: { category?: string; severity?: string }, limit = 100): RiskWithArticle[] {
    let query = db.select().from(risks).leftJoin(articles, eq(risks.articleId, articles.id)).orderBy(desc(risks.createdAt)).limit(limit);
    const all = query.all();
    return all
      .filter(row => {
        if (filters?.category && row.risks.category !== filters.category) return false;
        if (filters?.severity && row.risks.severity !== filters.severity) return false;
        return true;
      })
      .map(row => ({ ...row.risks, article: row.articles! }));
  }

  getRiskById(id: number): RiskWithArticle | undefined {
    const row = db.select().from(risks).leftJoin(articles, eq(risks.articleId, articles.id)).where(eq(risks.id, id)).get();
    if (!row) return undefined;
    return { ...row.risks, article: row.articles! };
  }

  insertRisk(risk: InsertRisk): Risk {
    return db.insert(risks).values(risk).returning().get();
  }

  getRiskStats(): { category: string; count: number; severityBreakdown: Record<string, number> }[] {
    const all = db.select().from(risks).all();
    const map: Record<string, { count: number; severityBreakdown: Record<string, number> }> = {};
    for (const r of all) {
      if (!map[r.category]) map[r.category] = { count: 0, severityBreakdown: {} };
      map[r.category].count++;
      map[r.category].severityBreakdown[r.severity] = (map[r.category].severityBreakdown[r.severity] || 0) + 1;
    }
    return Object.entries(map).map(([category, v]) => ({ category, ...v }));
  }

  getTotalRiskCount(): number {
    const result = db.select({ count: sql<number>`count(*)` }).from(risks).get();
    return result?.count ?? 0;
  }

  getRecentRisks(limit: number): RiskWithArticle[] {
    const rows = db.select().from(risks).leftJoin(articles, eq(risks.articleId, articles.id)).orderBy(desc(risks.createdAt)).limit(limit).all();
    return rows.map(row => ({ ...row.risks, article: row.articles! }));
  }

  // Saved Risks
  getSavedRisks(): SavedRiskWithDetails[] {
    const rows = db.select()
      .from(savedRisks)
      .leftJoin(risks, eq(savedRisks.riskId, risks.id))
      .leftJoin(articles, eq(risks.articleId, articles.id))
      .orderBy(desc(savedRisks.savedAt))
      .all();
    return rows.map(row => ({
      ...row.saved_risks,
      risk: row.risks!,
      article: row.articles!,
    }));
  }

  saveRisk(data: InsertSavedRisk): SavedRisk {
    return db.insert(savedRisks).values(data).returning().get();
  }

  unsaveRisk(riskId: number): void {
    db.delete(savedRisks).where(eq(savedRisks.riskId, riskId)).run();
  }

  isRiskSaved(riskId: number): boolean {
    const result = db.select({ id: savedRisks.id }).from(savedRisks).where(eq(savedRisks.riskId, riskId)).get();
    return !!result;
  }

  updateSavedRiskNotes(id: number, notes: string): void {
    db.update(savedRisks).set({ notes }).where(eq(savedRisks.id, id)).run();
  }

  // Feed Sources
  getFeedSources(): FeedSource[] {
    return db.select().from(feedSources).all();
  }

  insertFeedSource(source: InsertFeedSource): FeedSource {
    return db.insert(feedSources).values(source).returning().get();
  }

  updateFeedSourceLastFetched(id: number, timestamp: string): void {
    db.update(feedSources).set({ lastFetched: timestamp }).where(eq(feedSources.id, id)).run();
  }

  toggleFeedSource(id: number, active: boolean): void {
    db.update(feedSources).set({ active }).where(eq(feedSources.id, id)).run();
  }

  deleteFeedSource(id: number): void {
    db.delete(feedSources).where(eq(feedSources.id, id)).run();
  }

  // Refresh Log
  insertRefreshLog(log: InsertRefreshLog): RefreshLog {
    return db.insert(refreshLog).values(log).returning().get();
  }

  getRefreshHistory(limit = 20): RefreshLog[] {
    return db.select().from(refreshLog).orderBy(desc(refreshLog.ranAt)).limit(limit).all();
  }

  getLastRefresh(): RefreshLog | undefined {
    return db.select().from(refreshLog).orderBy(desc(refreshLog.ranAt)).limit(1).get();
  }
}

export const storage = new SqliteStorage();
