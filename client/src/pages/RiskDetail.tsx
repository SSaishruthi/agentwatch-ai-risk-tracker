import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, ExternalLink, Bookmark, BookmarkCheck, Tag, Cpu, Clock, ShieldAlert, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { RiskWithArticle } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

const SEVERITY_CONFIG = {
  critical: { label: "Critical", class: "severity-critical", barColor: "bg-red-500" },
  high: { label: "High", class: "severity-high", barColor: "bg-orange-500" },
  medium: { label: "Medium", class: "severity-medium", barColor: "bg-yellow-500" },
  low: { label: "Low", class: "severity-low", barColor: "bg-green-500" },
};

const SEVERITY_SCORE = { critical: 95, high: 75, medium: 50, low: 25 };

export default function RiskDetail() {
  const [, params] = useRoute("/risks/:id");
  const { toast } = useToast();
  const riskId = parseInt(params?.id ?? "0");

  const { data: risk, isLoading } = useQuery<RiskWithArticle>({
    queryKey: ["/api/risks", riskId],
    queryFn: () => apiRequest("GET", `/api/risks/${riskId}`).then(r => r.json()),
    enabled: !!riskId,
  });

  const { data: savedCheck } = useQuery({
    queryKey: ["/api/saved-risks/check", riskId],
    queryFn: () => apiRequest("GET", `/api/saved-risks/check/${riskId}`).then(r => r.json()),
    enabled: !!riskId,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/saved-risks", { riskId, savedAt: new Date().toISOString() }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-risks/check", riskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-risks"] });
      toast({ title: "Risk saved to watchlist" });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/saved-risks/${riskId}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-risks/check", riskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-risks"] });
      toast({ title: "Removed from watchlist" });
    },
  });

  const isSaved = savedCheck?.saved;
  const sev = SEVERITY_CONFIG[(risk?.severity ?? "medium") as keyof typeof SEVERITY_CONFIG];
  const score = SEVERITY_SCORE[(risk?.severity ?? "medium") as keyof typeof SEVERITY_SCORE];

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!risk) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Risk not found.</p>
        <Link href="/risks"><Button variant="outline" size="sm" className="mt-4">Back to feed</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5" data-testid="risk-detail">
      {/* Back nav */}
      <Link href="/risks">
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="back-button">
          <ArrowLeft size={14} />
          Risk Feed
        </button>
      </Link>

      {/* Main card */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-lg font-bold text-foreground leading-snug flex-1">{risk.title}</h1>
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            className="flex-shrink-0 gap-2"
            onClick={() => isSaved ? unsaveMutation.mutate() : saveMutation.mutate()}
            disabled={saveMutation.isPending || unsaveMutation.isPending}
            data-testid="save-button"
          >
            {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {isSaved ? "Watchlisted" : "Add to Watchlist"}
          </Button>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          <span className={cn("inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border", sev.class)}>
            <ShieldAlert size={12} />
            {sev.label} Severity
          </span>
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full text-muted-foreground bg-muted border border-border">
            <Tag size={12} />
            {risk.category}
          </span>
          {risk.affectedSystem && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full text-muted-foreground bg-muted border border-border">
              <Cpu size={12} />
              {risk.affectedSystem}
            </span>
          )}
        </div>

        {/* Risk score meter */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Risk Score</span>
            <span className="font-mono text-foreground font-semibold">{score}/100</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", sev.barColor)}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Risk Summary</h2>
          <p className="text-sm text-foreground/90 leading-relaxed">{risk.description}</p>
        </div>

        {/* Mitigation */}
        {risk.mitigationSuggestion && (
          <div className="bg-teal-500/5 border border-teal-500/20 rounded-md p-4">
            <h2 className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lightbulb size={12} />
              Mitigation Guidance
            </h2>
            <p className="text-sm text-foreground/80 leading-relaxed">{risk.mitigationSuggestion}</p>
          </div>
        )}

        {/* Source article */}
        {risk.article && (
          <div className="border-t border-border pt-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Source Article</h2>
            <div className="bg-muted/40 rounded-md p-3 space-y-2">
              <p className="text-sm font-medium text-foreground">{risk.article.title}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {risk.article.publishedAt
                    ? format(new Date(risk.article.publishedAt), "MMM d, yyyy 'at' h:mm a")
                    : "Unknown date"}
                </span>
                <span>·</span>
                <span>{risk.article.source}</span>
                <span className="capitalize bg-secondary px-2 py-0.5 rounded text-xs">{risk.article.sourceType?.replace("_", " ")}</span>
              </div>
              {risk.article.summary && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{risk.article.summary}</p>
              )}
              {risk.article.url && (
                <a
                  href={risk.article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  data-testid="source-link"
                >
                  <ExternalLink size={11} />
                  Read full article
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
