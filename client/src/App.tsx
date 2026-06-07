import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import RiskFeed from "@/pages/RiskFeed";
import RiskDetail from "@/pages/RiskDetail";
import SavedRisks from "@/pages/SavedRisks";
import ArticlesList from "@/pages/ArticlesList";
import FeedSettings from "@/pages/FeedSettings";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/risks" component={RiskFeed} />
              <Route path="/risks/:id" component={RiskDetail} />
              <Route path="/saved" component={SavedRisks} />
              <Route path="/articles" component={ArticlesList} />
              <Route path="/feeds" component={FeedSettings} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}
