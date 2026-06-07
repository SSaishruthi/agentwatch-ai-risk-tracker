import { Link } from "wouter";
import { Bookmark, BookmarkCheck, ExternalLink, CalendarDays, Tag, Cpu, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RiskWithArticle } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";

interface RiskCardProps {
  risk: RiskWithArticle;
  isSaved?: boolean;
  onSave?: (riskId: number) => void;
  onUnsave?: (riskId: number) => void;
}

const SEVERITY_CONFIG = {
  critical: {
    label: "Critical",
    dot: "bg-red-500",
    badge: "text-red-400 bg-red-500/10 border-red-500/25",
    tooltip: "Catastrophic or irreversible harm — existential threats, critical infrastructure compromise, large-scale systemic failure, or total uncontrolled breakdown.",
  },
  high: {
    label: "High",
    dot: "bg-orange-500",
    badge: "text-orange-400 bg-orange-500/10 border-orange-500/25",
    tooltip: "Serious harm at scale — significant data breach, widespread discrimination, financial loss, dangerous autonomous behavior, or systemic societal harm.",
  },
  medium: {
    label: "Medium",
    dot: "bg-yellow-500",
    badge: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25",
    tooltip: "Moderate or emerging concern — notable vulnerabilities, inefficiencies, or risks that may worsen without mitigation but are not yet causing widespread harm.",
  },
  low: {
    label: "Low",
    dot: "bg-green-500",
    badge: "text-green-400 bg-green-500/10 border-green-500/25",
    tooltip: "Minor or theoretical risk — limited scope, contained impact, edge cases, or speculative concerns with low probability of causing harm.",
  },
};

// IBM category pill colours
const CATEGORY_COLORS: Record<string, string> = {
  "Value Alignment":                 "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Fairness":                        "text-violet-400 bg-violet-500/10 border-violet-500/20",
  "Misplaced Trust":                 "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  "Computation Inefficiency":        "text-orange-400 bg-orange-500/10 border-orange-500/20",
  "Robustness":                      "text-red-400 bg-red-500/10 border-red-500/20",
  "Privacy and IP":                  "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Explainability and Transparency": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "Challenges":                      "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "Societal Impact":                 "text-pink-400 bg-pink-500/10 border-pink-500/20",
};

export default function RiskCard({ risk, isSaved, onSave, onUnsave }: RiskCardProps) {
  const sev = SEVERITY_CONFIG[risk.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
  const catColor = CATEGORY_COLORS[risk.category] ?? "text-muted-foreground bg-muted border-border";

  const publishedDate = risk.article?.publishedAt
    ? format(new Date(risk.article.publishedAt), "MMM d, yyyy")
    : null;
  const publishedAgo = risk.article?.publishedAt
    ? formatDistanceToNow(new Date(risk.article.publishedAt), { addSuffix: true })
    : null;

  return (
    <div
      className="risk-card bg-card border border-border rounded-lg px-4 py-3"
      data-testid={`risk-card-${risk.id}`}
    >
      <div className="flex items-start gap-3">
        {/* Severity dot */}
        <div className={cn("mt-2 flex-shrink-0 w-2 h-2 rounded-full", sev.dot)} />

        <div className="flex-1 min-w-0 space-y-1.5">

          {/* Row 1: Article title + source link */}
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/risks/${risk.id}`}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors leading-snug"
              data-testid={`risk-title-${risk.id}`}
            >
              {risk.article?.title ?? risk.title}
            </Link>
            {risk.article?.url && (
              <a
                href={risk.article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
                data-testid={`source-link-${risk.id}`}
              >
                {risk.article.source}
                <ExternalLink size={10} />
              </a>
            )}
          </div>

          {/* Row 2: Published date */}
          {publishedDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays size={11} />
              <span>{publishedDate}</span>
              <span className="text-border">·</span>
              <span>{publishedAgo}</span>
            </div>
          )}

          {/* Row 3: Risk summary */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {risk.description}
          </p>

          {/* Row 4: Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border cursor-help", sev.badge)}
                    data-testid={`severity-badge-${risk.id}`}
                  >
                    {sev.label}
                    <Info size={9} className="opacity-60" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                  <p className="font-semibold mb-0.5">{sev.label} severity</p>
                  <p>{sev.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border", catColor)}>
              <Tag size={9} />
              {risk.category}
            </span>
            {risk.affectedSystem && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-muted-foreground bg-muted border border-border">
                <Cpu size={9} />
                {risk.affectedSystem}
              </span>
            )}
          </div>
        </div>

        {/* Bookmark button */}
        {(onSave || onUnsave) && (
          <Button
            variant="ghost"
            size="sm"
            className={cn("flex-shrink-0 h-7 w-7 p-0", isSaved ? "text-primary" : "text-muted-foreground hover:text-primary")}
            onClick={() => isSaved ? onUnsave?.(risk.id) : onSave?.(risk.id)}
            data-testid={`save-risk-${risk.id}`}
          >
            {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </Button>
        )}
      </div>
    </div>
  );
}
