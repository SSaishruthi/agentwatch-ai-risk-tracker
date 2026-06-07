import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ExternalLink, Clock, Newspaper, BookOpen, FileText, Rss } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Article } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const SOURCE_TYPE_CONFIG = {
  news: { icon: Newspaper, label: "News", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  research_paper: { icon: BookOpen, label: "Research", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  blog: { icon: FileText, label: "Blog", color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  report: { icon: Rss, label: "Report", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

export default function ArticlesList() {
  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
    queryFn: () => apiRequest("GET", "/api/articles?limit=100").then(r => r.json()),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5" data-testid="articles-list">
      <div>
        <h1 className="text-xl font-bold text-foreground">Ingested Articles</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {articles?.length ?? 0} articles processed from AI news &amp; research feeds
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (articles?.length ?? 0) === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No articles ingested yet. Refresh feeds to start collecting data.
        </div>
      ) : (
        <div className="space-y-2" data-testid="article-items">
          {(articles ?? []).map(article => {
            const stConfig = SOURCE_TYPE_CONFIG[article.sourceType as keyof typeof SOURCE_TYPE_CONFIG] ?? SOURCE_TYPE_CONFIG.news;
            const Icon = stConfig.icon;
            return (
              <div key={article.id} className="bg-card border border-border rounded-lg p-3.5 flex items-start gap-3 hover:border-primary/30 transition-colors" data-testid={`article-${article.id}`}>
                <div className={cn("mt-0.5 flex-shrink-0 p-1.5 rounded-md border", stConfig.color)}>
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className="text-sm font-medium text-foreground line-clamp-2 flex-1">{article.title}</p>
                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        data-testid={`article-link-${article.id}`}
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                  {article.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{article.summary}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <Clock size={11} />
                    <span>
                      {article.publishedAt
                        ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })
                        : "Date unknown"}
                    </span>
                    <span className="text-border">·</span>
                    <span>{article.source}</span>
                    <span className={cn("px-1.5 py-0.5 rounded text-xs border capitalize", stConfig.color)}>
                      {stConfig.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
