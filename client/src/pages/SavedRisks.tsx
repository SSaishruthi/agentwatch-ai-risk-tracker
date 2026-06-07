import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bookmark } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import RiskCard from "@/components/RiskCard";
import type { SavedRiskWithDetails } from "@shared/schema";

export default function SavedRisks() {
  const { toast } = useToast();

  const { data: saved, isLoading } = useQuery<SavedRiskWithDetails[]>({
    queryKey: ["/api/saved-risks"],
    queryFn: () => apiRequest("GET", "/api/saved-risks").then(r => r.json()),
  });

  const unsaveMutation = useMutation({
    mutationFn: (riskId: number) =>
      apiRequest("DELETE", `/api/saved-risks/${riskId}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-risks"] });
      toast({ title: "Removed from watchlist" });
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5" data-testid="saved-risks">
      <div>
        <h1 className="text-xl font-bold text-foreground">Watchlist</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {saved?.length ?? 0} risks saved for governance review
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (saved?.length ?? 0) === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Bookmark size={32} className="mx-auto text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No risks saved yet.</p>
          <p className="text-xs text-muted-foreground">Save risks from the feed to track them here.</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="saved-risks-list">
          {(saved ?? []).map(item => (
            <RiskCard
              key={item.id}
              risk={{ ...item.risk, article: item.article }}
              isSaved={true}
              onUnsave={(riskId) => unsaveMutation.mutate(riskId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
