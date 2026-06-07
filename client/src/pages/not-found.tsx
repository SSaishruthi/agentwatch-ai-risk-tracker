import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center gap-4">
      <p className="text-5xl font-bold text-muted-foreground opacity-30">404</p>
      <p className="text-sm text-muted-foreground">Page not found</p>
      <Link href="/"><Button size="sm" variant="outline">Back to Dashboard</Button></Link>
    </div>
  );
}
