import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  onRefresh: () => void;
}

export function DashboardHeader({ onToggleSidebar, onRefresh }: DashboardHeaderProps) {
  const { toast } = useToast();
  
  const handleRefresh = () => {
    onRefresh();
    toast({
      title: "Refreshed",
      description: "Dashboard data has been updated.",
      duration: 2000,
    });
  };
  
  return (
    <header className="bg-[#2D3136] p-4 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button 
            className="lg:hidden text-[#B9BBBE] mr-4"
            onClick={onToggleSidebar}
          >
            <i className="fas fa-bars"></i>
          </button>
          <h2 className="font-semibold text-lg text-white">Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleRefresh}
            className="bg-[#5865F2] hover:bg-opacity-80 text-white"
            size="sm"
          >
            Refresh
          </Button>
          <div className="relative">
            <button className="bg-[#42464D] hover:bg-opacity-80 rounded-full w-8 h-8 flex items-center justify-center text-white">
              <i className="fas fa-bell"></i>
            </button>
            <div className="absolute top-0 right-0 bg-[#F04747] rounded-full w-3 h-3"></div>
          </div>
        </div>
      </div>
    </header>
  );
}
