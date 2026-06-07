import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, Trash2, RefreshCw, CheckCircle, Clock, Calendar,
  CalendarRange, Activity, Filter, ArrowDownUp, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { FeedSource } from "@shared/schema";
import { SOURCE_TYPES } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

export default function FeedSettings() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState<string>("news");

  const { data: feeds, isLoading: feedsLoading } = useQuery<FeedSource[]>({
    queryKey: ["/api/feeds"],
    queryFn: () => apiRequest("GET", "/api/feeds").then(r => r.json()),
  });

  const { data: refreshMeta, isLoading: metaLoading } = useQuery({
    queryKey: ["/api/refresh-log"],
    queryFn: () => apiRequest("GET", "/api/refresh-log").then(r => r.json()),
    refetchInterval: 30000,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/feeds", { name, url, sourceType, active: true, lastFetched: null }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feeds"] });
      setName(""); setUrl(""); setSourceType("news");
      toast({ title: "Feed source added" });
    },
    onError: () => toast({ title: "Failed to add feed — check the URL is a valid RSS/Atom feed", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiRequest("PATCH", `/api/feeds/${id}/toggle`, { active }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feeds"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/feeds/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feeds"] });
      toast({ title: "Feed removed" });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/refresh", {}).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/refresh-log"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      toast({
        title: "Feeds refreshed",
        description: `+${data.articlesAdded} articles · +${data.risksExtracted} risks · ${data.articlesFiltered} pre-2025 filtered`,
      });
    },
    onError: () => toast({ title: "Refresh failed", variant: "destructive" }),
  });

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) return;
    addMutation.mutate();
  };

  const last = refreshMeta?.lastRefresh;
  const history = refreshMeta?.history ?? [];
  const dateFilter = refreshMeta?.dateFilter;
  const articleDateRange = refreshMeta?.articleDateRange;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6" data-testid="feed-settings">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Feed Sources</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure RSS/Atom feeds · daily auto-refresh at 06:00 UTC
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="gap-2"
          data-testid="refresh-all-button"
        >
          <RefreshCw size={14} className={cn(refreshMutation.isPending && "animate-spin")} />
          {refreshMutation.isPending ? "Fetching..." : "Refresh Now"}
        </Button>
      </div>

      {/* Refresh Status + Date Filter cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Last / Next refresh */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={12} className="text-primary" />
            Refresh Schedule
          </h2>
          {metaLoading ? <Skeleton className="h-16 w-full" /> : (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Clock size={13} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Last refresh</p>
                  <p className="text-sm font-medium text-foreground">
                    {last
                      ? `${formatDistanceToNow(new Date(last.ranAt), { addSuffix: true })} · ${last.triggeredBy}`
                      : "Never"}
                  </p>
                  {last && (
                    <p className="text-xs text-muted-foreground">
                      +{last.articlesAdded} articles · +{last.risksExtracted} risks
                      {last.articlesFiltered > 0 && ` · ${last.articlesFiltered} pre-2025 filtered`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar size={13} className="mt-0.5 flex-shrink-0 text-green-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Next automatic refresh</p>
                  <p className="text-sm font-medium text-green-400">
                    {refreshMeta?.nextRefreshSchedule ?? "Daily at 06:00 UTC"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Article date filter info */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={12} className="text-primary" />
            Article Date Filter
          </h2>
          {metaLoading ? <Skeleton className="h-16 w-full" /> : (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <CalendarRange size={13} className="mt-0.5 flex-shrink-0 text-amber-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Accepting articles from</p>
                  <p className="text-sm font-medium text-foreground">
                    January 1, 2025 → present
                  </p>
                  <p className="text-xs text-muted-foreground">Older articles are automatically skipped</p>
                </div>
              </div>
              {articleDateRange?.oldest && (
                <div className="flex items-start gap-2.5">
                  <ArrowDownUp size={13} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Current database range</p>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(articleDateRange.oldest), "MMM d, yyyy")}
                      {" → "}
                      {format(new Date(articleDateRange.newest), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">{articleDateRange.total} articles stored</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Refresh history */}
      {history.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={12} className="text-primary" />
            Recent Refresh History
          </h2>
          <div className="space-y-1.5">
            {history.slice(0, 8).map(run => {
              const hasErrors = run.errors && run.errors !== "null";
              return (
                <div key={run.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-border/50 last:border-0">
                  <div className={cn(
                    "flex-shrink-0 w-1.5 h-1.5 rounded-full",
                    hasErrors ? "bg-orange-500" : "bg-green-500"
                  )} />
                  <span className="text-muted-foreground w-32 flex-shrink-0">
                    {format(new Date(run.ranAt), "MMM d, HH:mm")}
                  </span>
                  <span className={cn("capitalize flex-shrink-0 px-1.5 py-0.5 rounded text-xs border",
                    run.triggeredBy === "scheduled"
                      ? "text-teal-400 bg-teal-500/10 border-teal-500/20"
                      : "text-muted-foreground bg-muted border-border"
                  )}>
                    {run.triggeredBy}
                  </span>
                  <span className="text-foreground flex-shrink-0">
                    +{run.articlesAdded} articles · +{run.risksExtracted} risks
                  </span>
                  {run.articlesFiltered > 0 && (
                    <span className="text-muted-foreground">{run.articlesFiltered} filtered</span>
                  )}
                  {run.durationMs && (
                    <span className="text-muted-foreground ml-auto">{(run.durationMs / 1000).toFixed(1)}s</span>
                  )}
                  {hasErrors && (
                    <AlertCircle size={12} className="text-orange-400 ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add feed form */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus size={14} className="text-primary" />
          Add Feed Source
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            placeholder="Feed name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-sm h-9"
            data-testid="feed-name-input"
          />
          <Input
            placeholder="RSS/Atom URL"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="text-sm h-9"
            data-testid="feed-url-input"
          />
          <Select value={sourceType} onValueChange={setSourceType}>
            <SelectTrigger className="h-9 text-sm" data-testid="feed-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={addMutation.isPending || !name.trim() || !url.trim()}
          className="gap-2"
          data-testid="add-feed-button"
        >
          <Plus size={13} />
          Add Feed
        </Button>
      </div>

      {/* Feed list */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Active Sources ({feeds?.filter(f => f.active).length ?? 0} / {feeds?.length ?? 0})
        </h2>
        {feedsLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : (feeds?.length ?? 0) === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No feeds configured.</div>
        ) : (
          (feeds ?? []).map(feed => (
            <div
              key={feed.id}
              className={cn(
                "bg-card border rounded-lg p-3.5 flex items-center gap-3 transition-opacity border-border",
                !feed.active && "opacity-50"
              )}
              data-testid={`feed-${feed.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{feed.name}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize border border-border">
                    {feed.sourceType?.replace("_", " ")}
                  </span>
                  {feed.active && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle size={11} />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{feed.url}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {feed.lastFetched
                    ? `Last fetched ${formatDistanceToNow(new Date(feed.lastFetched), { addSuffix: true })}`
                    : "Not yet fetched"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  checked={feed.active ?? false}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: feed.id, active: checked })}
                  data-testid={`toggle-feed-${feed.id}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(feed.id)}
                  data-testid={`delete-feed-${feed.id}`}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
