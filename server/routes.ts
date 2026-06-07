import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { fetchAndProcessFeeds, seedDefaultFeeds, seedDemoData } from "./newsFetcher";
import { insertFeedSourceSchema, insertSavedRiskSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express) {
  // Seed default feeds and demo data on startup
  await seedDefaultFeeds();
  await seedDemoData();

  // === DASHBOARD STATS ===
  app.get("/api/stats", (_req, res) => {
    try {
      const totalRisks = storage.getTotalRiskCount();
      const recentRisks = storage.getRecentRisks(5);
      const stats = storage.getRiskStats();
      const articles = storage.getArticles(100);

      const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
      const allRisks = storage.getRisks({}, 500);
      for (const r of allRisks) {
        severityCounts[r.severity as keyof typeof severityCounts]++;
      }

      res.json({
        totalRisks,
        totalArticles: articles.length,
        categoryStats: stats,
        severityCounts,
        recentRisks,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // === RISKS ===
  app.get("/api/risks", (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const severity = req.query.severity as string | undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      const risks = storage.getRisks(
        { category: category || undefined, severity: severity || undefined },
        limit
      );
      res.json(risks);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch risks" });
    }
  });

  app.get("/api/risks/:id", (req, res) => {
    try {
      const risk = storage.getRiskById(parseInt(req.params.id));
      if (!risk) return res.status(404).json({ error: "Risk not found" });
      res.json(risk);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch risk" });
    }
  });

  // === ARTICLES ===
  app.get("/api/articles", (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const articles = storage.getArticles(limit, offset);
      res.json(articles);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  // === SAVED RISKS ===
  app.get("/api/saved-risks", (_req, res) => {
    try {
      const saved = storage.getSavedRisks();
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch saved risks" });
    }
  });

  app.post("/api/saved-risks", (req, res) => {
    try {
      const data = insertSavedRiskSchema.parse({
        ...req.body,
        savedAt: new Date().toISOString(),
      });
      const saved = storage.saveRisk(data);
      res.json(saved);
    } catch (err) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  app.delete("/api/saved-risks/:riskId", (req, res) => {
    try {
      storage.unsaveRisk(parseInt(req.params.riskId));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to unsave risk" });
    }
  });

  app.get("/api/saved-risks/check/:riskId", (req, res) => {
    try {
      const saved = storage.isRiskSaved(parseInt(req.params.riskId));
      res.json({ saved });
    } catch (err) {
      res.status(500).json({ error: "Failed to check" });
    }
  });

  app.patch("/api/saved-risks/:id/notes", (req, res) => {
    try {
      const schema = z.object({ notes: z.string() });
      const { notes } = schema.parse(req.body);
      storage.updateSavedRiskNotes(parseInt(req.params.id), notes);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // === FEED SOURCES ===
  app.get("/api/feeds", (_req, res) => {
    try {
      const feeds = storage.getFeedSources();
      res.json(feeds);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch feeds" });
    }
  });

  app.post("/api/feeds", (req, res) => {
    try {
      const data = insertFeedSourceSchema.parse(req.body);
      const feed = storage.insertFeedSource(data);
      res.json(feed);
    } catch (err) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  app.patch("/api/feeds/:id/toggle", (req, res) => {
    try {
      const schema = z.object({ active: z.boolean() });
      const { active } = schema.parse(req.body);
      storage.toggleFeedSource(parseInt(req.params.id), active);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  app.delete("/api/feeds/:id", (req, res) => {
    try {
      storage.deleteFeedSource(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete feed" });
    }
  });

  // === REFRESH / FETCH NEW ARTICLES ===
  app.post("/api/refresh", async (req, res) => {
    try {
      const triggeredBy = req.body?.triggeredBy === "scheduled" ? "scheduled" : "manual";
      const result = await fetchAndProcessFeeds(triggeredBy);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === REFRESH LOG ===
  app.get("/api/refresh-log", (_req, res) => {
    try {
      const history = storage.getRefreshHistory(20);
      const last = storage.getLastRefresh();

      // Compute article date range from all ingested articles
      const allArticles = storage.getArticles(1000);
      const dates = allArticles
        .map(a => a.publishedAt)
        .filter(Boolean)
        .map(d => new Date(d!).getTime())
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

      const oldestArticle = dates.length > 0 ? new Date(dates[0]).toISOString() : null;
      const newestArticle = dates.length > 0 ? new Date(dates[dates.length - 1]).toISOString() : null;

      res.json({
        history,
        lastRefresh: last ?? null,
        // Next refresh: daily at 06:00 UTC
        nextRefreshSchedule: "Daily at 06:00 UTC",
        dateFilter: {
          from: "2025-01-01",
          to: "now",
          description: "Articles published from January 1, 2025 to present",
        },
        articleDateRange: {
          oldest: oldestArticle,
          newest: newestArticle,
          total: allArticles.length,
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch refresh log" });
    }
  });
}
