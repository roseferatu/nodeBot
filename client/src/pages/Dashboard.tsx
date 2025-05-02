import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ConversationMonitor } from "@/components/ConversationMonitor";
import { CommandDocumentation } from "@/components/CommandDocumentation";
import { ApiStatusPanel } from "@/components/ApiStatusPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const queryClient = useQueryClient();
  
  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };
  
  const refreshData = () => {
    queryClient.invalidateQueries({
      queryKey: ['/api/status'],
    });
    queryClient.invalidateQueries({
      queryKey: ['/api/conversations'],
    });
  };
  
  return (
    <div className="bg-[#36393F] text-white min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Sidebar - always visible on desktop, toggleable on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Mobile sidebar */}
      {sidebarVisible && (
        <div className="lg:hidden">
          <Sidebar isMobile={true} />
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={toggleSidebar}
          ></div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader 
          onToggleSidebar={toggleSidebar} 
          onRefresh={refreshData}
        />
        
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <ConversationMonitor />
          
          <div className="w-full md:w-80 xl:w-96 bg-[#2D3136] flex-shrink-0 overflow-hidden flex flex-col">
            <Tabs defaultValue="commands" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-4 my-2 bg-[#36393F]">
                <TabsTrigger 
                  value="commands" 
                  className="data-[state=active]:bg-[#5865F2] data-[state=active]:text-white"
                >
                  Commands
                </TabsTrigger>
                <TabsTrigger 
                  value="status" 
                  className="data-[state=active]:bg-[#5865F2] data-[state=active]:text-white"
                >
                  API Status
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="commands" className="flex-1 overflow-auto m-0 p-0 border-0">
                <CommandDocumentation />
              </TabsContent>
              
              <TabsContent value="status" className="flex-1 overflow-auto m-0 p-0 border-0">
                <ApiStatusPanel />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
