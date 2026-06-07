import { Link, useLocation } from "wouter";
import { LayoutDashboard, AlertTriangle, Bookmark, Newspaper, Rss, Shield, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/risks", icon: AlertTriangle, label: "Risk Feed" },
  { href: "/saved", icon: Bookmark, label: "Saved Risks" },
  { href: "/articles", icon: Newspaper, label: "Articles" },
  { href: "/feeds", icon: Rss, label: "Feed Sources" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
    refetchInterval: 60000,
  });

  const criticalCount = stats?.severityCounts?.critical ?? 0;

  return (
    <aside className="w-60 flex-shrink-0 border-r border-border bg-card flex flex-col h-screen sticky top-0" data-testid="sidebar">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          {/* SVG Logo — hexagon shield with dot */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="AgentWatch logo">
            <polygon points="16,3 28,9.5 28,22.5 16,29 4,22.5 4,9.5" fill="hsl(38,92%,55%)" opacity="0.15" />
            <polygon points="16,3 28,9.5 28,22.5 16,29 4,22.5 4,9.5" fill="none" stroke="hsl(38,92%,55%)" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="3.5" fill="hsl(38,92%,55%)" />
            <line x1="16" y1="12.5" x2="16" y2="6" stroke="hsl(38,92%,55%)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <div className="font-bold text-sm tracking-tight text-foreground" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              AgentWatch
            </div>
            <div className="text-xs text-muted-foreground">AI Risk Intelligence</div>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      <div className="px-5 py-3 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-xs text-muted-foreground">Live monitoring</span>
        {criticalCount > 0 && (
          <span className="ml-auto text-xs font-semibold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded-full border border-red-500/30">
            {criticalCount} critical
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5" data-testid="nav">
        {navItems.map(item => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 group",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
            >
              <item.icon size={16} className={cn("flex-shrink-0", active ? "text-primary" : "")} />
              <span>{item.label}</span>
              {active && <ChevronRight size={14} className="ml-auto text-primary opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer stats */}
      {stats && (
        <div className="p-4 border-t border-border space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total risks</span>
            <span className="text-foreground font-medium">{stats.totalRisks}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Articles ingested</span>
            <span className="text-foreground font-medium">{stats.totalArticles}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
