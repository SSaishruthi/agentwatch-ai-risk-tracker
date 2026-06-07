import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { AlertTriangle, FileText, Bookmark, RefreshCw, ShieldCheck, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import RiskCard from "@/components/RiskCard";
import type { RiskWithArticle, SavedRisk } from "@shared/schema";
import { RISK_CATEGORY_DESCRIPTIONS } from "@shared/schema";
import { cn } from "@/lib/utils";

// IBM category colours — distinct hues, dark-mode legible
const IBM_CATEGORY_COLORS: Record<string, string> = {
  "Value Alignment":              "#f59e0b", // amber
  "Fairness":                     "#8b5cf6", // violet
  "Misplaced Trust":              "#06b6d4", // cyan
  "Computation Inefficiency":     "#f97316", // orange
  "Robustness":                   "#ef4444", // red
  "Privacy and IP":               "#3b82f6", // blue
  "Explainability and Transparency": "#10b981", // emerald
  "Challenges":                   "#a78bfa", // lavender
  "Societal Impact":              "#ec4899", // pink
};

const SHORT_NAMES: Record<string, string> = {
  "Value Alignment":              "Value Alignment",
  "Fairness":                     "Fairness",
  "Misplaced Trust":              "Misplaced Trust",
  "Computation Inefficiency":     "Compute Inefficiency",
  "Robustness":                   "Robustness",
  "Privacy and IP":               "Privacy & IP",
  "Explainability and Transparency": "Explainability",
  "Challenges":                   "Governance Challenges",
  "Societal Impact":              "Societal Impact",
};

// Custom tooltip for category chart
function CategoryTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const desc = RISK_CATEGORY_DESCRIPTIONS[d.fullName] ?? "";
  return (
    <div className="max-w-xs bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground">{d.fullName}</p>
      <p className="text-muted-foreground leading-relaxed">{desc}</p>
      <p className="text-primary font-medium">{d.count} risk{d.count !== 1 ? "s" : ""} detected</p>
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();

  const { data: refreshMeta } = useQuery({
    queryKey: ["/api/refresh-log"],
    queryFn: () => apiRequest("GET", "/api/refresh-log").then(r => r.json()),
    refetchInterval: 60000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
  });

  const { data: savedRisks } = useQuery<SavedRisk[]>({
    queryKey: ["/api/saved-risks"],
    queryFn: () => apiRequest("GET", "/api/saved-risks").then(r => r.json()),
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/refresh").then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      toast({
        title: "Feed refreshed",
        description: `+${data.articlesAdded} articles · +${data.risksExtracted} risks extracted`,
      });
    },
    onError: () => toast({ title: "Refresh failed", variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: (riskId: number) =>
      apiRequest("POST", "/api/saved-risks", { riskId, savedAt: new Date().toISOString() }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-risks"] });
      toast({ title: "Risk saved to watchlist" });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (riskId: number) =>
      apiRequest("DELETE", `/api/saved-risks/${riskId}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/saved-risks"] }),
  });

  const savedRiskIds = new Set((savedRisks ?? []).map((s: any) => s.riskId));

  // Build IBM category bar data
  const categoryData = (stats?.categoryStats ?? [])
    .map((s: any) => ({
      name: SHORT_NAMES[s.category] ?? s.category,
      fullName: s.category,
      count: s.count,
      color: IBM_CATEGORY_COLORS[s.category] ?? "#94a3b8",
    }))
    .sort((a: any, b: any) => b.count - a.count);

  // Top IBM category for headline callout
  const topCategory = categoryData[0] ?? null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Risk Intelligence Dashboard</h1>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Agentic AI risks mapped to the{" "}
              <a
                href="https://www.ibm.com/granite/docs/resources/ai-agents-opportunities-risks-and-mitigations.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                IBM Granite risk framework
              </a>
            </p>
            {refreshMeta?.lastRefresh && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
                <Clock size={10} />
                Last refresh:{" "}
                {formatDistanceToNow(new Date(refreshMeta.lastRefresh.ranAt), { addSuffix: true })}
                <span className="text-border mx-1">·</span>
                <span className="text-green-400">Next: daily 06:00 UTC</span>
              </span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="gap-2"
          data-testid="refresh-button"
        >
          <RefreshCw size={14} className={cn(refreshMutation.isPending && "animate-spin")} />
          {refreshMutation.isPending ? "Fetching..." : "Refresh Feeds"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {/* Total Risks — clickable, links to full risk feed */}
        <a
          href="#/risks"
          className="block bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors group no-underline"
          data-testid="kpi-total-risks"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-500/10">
              <AlertTriangle size={16} className="text-amber-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">
                {statsLoading ? <Skeleton className="h-6 w-12" /> : stats?.totalRisks ?? 0}
              </div>
              <div className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                Total Risks <span className="text-primary">→</span>
              </div>
            </div>
          </div>
        </a>

        {/* Articles Ingested */}
        <div className="bg-card border border-border rounded-lg p-4" data-testid="kpi-articles-ingested">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-500/10">
              <FileText size={16} className="text-blue-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">
                {statsLoading ? <Skeleton className="h-6 w-12" /> : stats?.totalArticles ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Articles Ingested</div>
            </div>
          </div>
        </div>

        {/* Watchlisted */}
        <div className="bg-card border border-border rounded-lg p-4" data-testid="kpi-watchlisted">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-teal-500/10">
              <Bookmark size={16} className="text-teal-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">
                {statsLoading ? <Skeleton className="h-6 w-12" /> : savedRisks?.length ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Watchlisted</div>
            </div>
          </div>
        </div>
      </div>

      {/* IBM Risk Category Chart — full width */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck size={14} className="text-primary" />
              IBM Risk Category Distribution
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Based on IBM Granite AI Agents framework — hover bars for category definitions
            </p>
          </div>
          {topCategory && !statsLoading && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Top category</p>
              <p className="text-sm font-semibold" style={{ color: topCategory.color }}>
                {topCategory.fullName}
              </p>
            </div>
          )}
        </div>

        {statsLoading ? (
          <Skeleton className="h-52 w-full mt-4" />
        ) : categoryData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No risks categorised yet. Refresh feeds to begin.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ left: 4, right: 40, top: 8, bottom: 4 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(215,12%,52%)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(215,12%,52%)" }}
                axisLine={false}
                tickLine={false}
                width={140}
              />
              <Tooltip content={<CategoryTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="count" radius={[0, 5, 5, 0]} label={{ position: "right", fontSize: 11, fill: "hsl(215,12%,52%)" }}>
                {categoryData.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Category legend */}
        {!statsLoading && categoryData.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border">
            {categoryData.map((c: any) => (
              <div key={c.fullName} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                <span>{c.fullName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest Risk Signals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Latest Risk Signals</h2>
          <a href="/#/risks" className="text-xs text-primary hover:underline">View all →</a>
        </div>
        {statsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <div className="space-y-2" data-testid="recent-risks">
            {(stats?.recentRisks ?? []).map((risk: RiskWithArticle) => (
              <RiskCard
                key={risk.id}
                risk={risk}
                isSaved={savedRiskIds.has(risk.id)}
                onSave={(id) => saveMutation.mutate(id)}
                onUnsave={(id) => unsaveMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
