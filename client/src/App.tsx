import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Strains from "@/pages/Strains";

function Router() {
  return (
    <>
      <nav className="border-b py-3 bg-white">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Link href="/">
              <div className="px-4 py-2 font-medium text-gray-800 hover:text-gray-600 cursor-pointer">Dashboard</div>
            </Link>
            <Link href="/strains">
              <div className="px-4 py-2 font-medium text-gray-800 hover:text-gray-600 cursor-pointer">Strains</div>
            </Link>
          </div>
        </div>
      </nav>
      <Switch>
        {/* Dashboard is our main page */}
        <Route path="/" component={Dashboard} />
        {/* Strains page */}
        <Route path="/strains" component={Strains} />
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
