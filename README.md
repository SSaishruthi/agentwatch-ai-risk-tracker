# AgentWatch — AI Risk Tracker

A real-time dashboard that monitors agentic AI system risks from daily news articles and research papers. Risks are categorized using the **IBM Granite AI Risk Framework** (9 categories, pp. 7–11 of the [IBM Granite Agents Risk Report](https://www.ibm.com/granite/docs/resources/ai-agents-opportunities-risks-and-mitigations.pdf)).

🌐 **Live app:** [ss-airisk-app.pplx.app](https://ss-airisk-app.pplx.app)

---

## What It Does

- **Ingests** articles daily from 8 curated RSS feeds (AI safety, alignment, ML research, tech news)
- **Filters** to articles published from January 1, 2025 onward
- **Extracts** risk signals using keyword matching against IBM Granite categories
- **Displays** each risk as: Article title → Published date → One-line risk summary → Source link
- **Refreshes** automatically twice daily (06:00 UTC and 21:00 UTC)

---

## IBM Granite Risk Categories

| # | Category | Description |
|---|----------|-------------|
| 1 | **Value Alignment** | Agents acting against human values, ethics, or guidelines |
| 2 | **Fairness** | Discrimination, disparate impact, data bias |
| 3 | **Misplaced Trust** | Over- or under-reliance on AI agents |
| 4 | **Computation Inefficiency** | Infinite loops, redundant actions, runaway cost |
| 5 | **Robustness** | Adversarial attacks, prompt injection, hallucination |
| 6 | **Privacy and IP** | PII leaks, IP/confidential data exposure |
| 7 | **Explainability and Transparency** | Black-box decisions, missing audit trails |
| 8 | **Challenges** | Evaluation, compliance, reproducibility, NIST/EU AI Act |
| 9 | **Societal Impact** | Jobs, environment, human dignity, human agency |

---

## Default RSS Feed Sources

| Source | Feed URL |
|--------|----------|
| AI Safety Newsletter | https://www.aisafetyatlas.org/feed.xml |
| MIT Technology Review | https://www.technologyreview.com/feed/ |
| VentureBeat AI | https://feeds.feedburner.com/venturebeat/SZYF |
| ArXiv CS.AI | https://rss.arxiv.org/rss/cs.AI |
| ArXiv CS.LG | https://rss.arxiv.org/rss/cs.LG |
| The Gradient | https://thegradient.pub/rss/ |
| AI Alignment Forum | https://www.alignmentforum.org/feed.xml |
| Center for AI Safety | https://www.safe.ai/blog-rss.xml |

You can add, remove, or toggle feed sources from the **Feed Sources** page in the app.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript |
| UI | Tailwind CSS v3 + shadcn/ui |
| Backend | Express.js |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| Charts | Recharts |
| Hosting | Perplexity pplx.app |

---

## Running Locally

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Clone the repo
git clone https://github.com/SSaishruthi/agentwatch-ai-risk-tracker.git
cd agentwatch-ai-risk-tracker

# Install dependencies
npm install

# Start the development server (frontend + backend on the same port)
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

The SQLite database (`data.db`) is created automatically on first run. If no articles exist, demo data covering all 9 IBM categories is seeded automatically.

### Trigger a Feed Refresh

From the app, click **Refresh Feeds** on the Dashboard, or call the API directly:

```bash
curl -X POST http://localhost:5000/api/refresh \
  -H "Content-Type: application/json" \
  -d '{"triggeredBy": "manual"}'
```

### Build for Production

```bash
npm run build

# Start the production server
NODE_ENV=production node dist/index.cjs
```

---

## Project Structure

```
agentwatch-ai-risk-tracker/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # RiskCard, Sidebar, shadcn/ui components
│       ├── pages/           # Dashboard, RiskFeed, RiskDetail, FeedSettings, SavedRisks, ArticlesList
│       └── lib/             # API client (queryClient)
├── server/                  # Express backend
│   ├── index.ts             # Server entry point + Helmet security headers
│   ├── routes.ts            # All API routes
│   ├── storage.ts           # Drizzle ORM CRUD operations
│   ├── riskAnalyzer.ts      # IBM category keyword mappings + risk extraction
│   └── newsFetcher.ts       # RSS feed fetching + 2025+ date filter + refresh logging
├── shared/
│   └── schema.ts            # Drizzle schema: articles, risks, savedRisks, feedSources, refreshLog
├── scripts/                 # One-time data processing scripts
└── data.db                  # SQLite database (auto-created, git-ignored)
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats` | Dashboard KPIs, category stats, recent risks |
| `GET` | `/api/risks` | List risks (query: `category`, `severity`, `limit`) |
| `GET` | `/api/risks/:id` | Single risk with source article |
| `GET` | `/api/articles` | Ingested articles (query: `limit`, `offset`) |
| `POST` | `/api/refresh` | Trigger feed refresh (`body: { triggeredBy }`) |
| `GET` | `/api/refresh-log` | Refresh history, schedule, date filter, article date range |
| `GET` | `/api/feeds` | List feed sources |
| `POST` | `/api/feeds` | Add a feed source |
| `PATCH` | `/api/feeds/:id/toggle` | Enable / disable a feed |
| `DELETE` | `/api/feeds/:id` | Remove a feed |
| `GET` | `/api/saved-risks` | Watchlisted risks |
| `POST` | `/api/saved-risks` | Save a risk to watchlist |
| `DELETE` | `/api/saved-risks/:riskId` | Remove from watchlist |
| `PATCH` | `/api/saved-risks/:id/notes` | Update watchlist notes |

---

## References

- [IBM Granite AI Agents: Opportunities, Risks, and Mitigations](https://www.ibm.com/granite/docs/resources/ai-agents-opportunities-risks-and-mitigations.pdf)
- [NIST AI Risk Management Framework](https://www.nist.gov/system/files/documents/2023/01/26/AI%20RMF%201.0.pdf)
- [EU AI Act](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689)
