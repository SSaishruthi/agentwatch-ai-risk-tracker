import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Info, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import RiskCard from "@/components/RiskCard";
import type { RiskWithArticle, SavedRisk } from "@shared/schema";
import { RISK_CATEGORIES, SEVERITY_LEVELS } from "@shared/schema";

const SEVERITY_LEGEND = [
  {
    level: "Critical",
    dot: "bg-red-500",
    text: "text-red-400",
    desc: "Catastrophic or irreversible harm — existential threats, critical infrastructure failure, or total uncontrolled breakdown.",
  },
  {
    level: "High",
    dot: "bg-orange-500",
    text: "text-orange-400",
    desc: "Serious harm at scale — significant data breach, widespread discrimination, financial loss, or dangerous autonomous behavior.",
  },
  {
    level: "Medium",
    dot: "bg-yellow-500",
    text: "text-yellow-400",
    desc: "Moderate or emerging concern — notable vulnerabilities or inefficiencies that may worsen without mitigation.",
  },
  {
    level: "Low",
    dot: "bg-green-500",
    text: "text-green-400",
    desc: "Minor or theoretical risk — limited scope, edge cases, or speculative concerns with low probability of harm.",
  },
];

export default function RiskFeed() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: risks, isLoading } = useQuery<RiskWithArticle[]>({
    queryKey: ["/api/risks", categoryFilter, severityFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "200" });
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      return apiRequest("GET", `/api/risks?${params}`).then(r => r.json());
    },
  });

  const { data: savedRisks } = useQuery<SavedRisk[]>({
    queryKey: ["/api/saved-risks"],
    queryFn: () => apiRequest("GET", "/api/saved-risks").then(r => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: (riskId: number) =>
      apiRequest("POST", "/api/saved-risks", { riskId, savedAt: new Date().toISOString() }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-risks"] });
      toast({ title: "Risk added to watchlist" });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (riskId: number) =>
      apiRequest("DELETE", `/api/saved-risks/${riskId}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/saved-risks"] }),
  });

  const savedRiskIds = new Set((savedRisks ?? []).map((s: any) => s.riskId));

  const filtered = (risks ?? []).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      (r.affectedSystem ?? "").toLowerCase().includes(q) ||
      (r.article?.source ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5" data-testid="risk-feed">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Risk Feed</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} risk signals detected from news &amp; research
          </p>
        </div>

        {/* Severity legend */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Severity:</span>
          <TooltipProvider delayDuration={150}>
            {SEVERITY_LEGEND.map(({ level, dot, text, desc }) => (
              <Tooltip key={level}>
                <TooltipTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 cursor-help group"
                    data-testid={`severity-legend-${level.toLowerCase()}`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                    <span className={`text-xs font-medium ${text} group-hover:underline`}>{level}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
                  <p className="font-semibold mb-0.5">{level} severity</p>
                  <p>{desc}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
          <Info size={12} className="text-muted-foreground ml-1" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search risks, systems, sources..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
            data-testid="search-input"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-52 h-9 text-sm" data-testid="category-filter">
            <Filter size={13} className="mr-1 text-muted-foreground" />
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {RISK_CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40 h-9 text-sm" data-testid="severity-filter">
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {SEVERITY_LEVELS.map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Risk list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No risks found matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="risks-list">
          {filtered.map(risk => (
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
  );
}
