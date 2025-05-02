import { useQuery } from "@tanstack/react-query";
import { ApiStatus } from "@shared/schema";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  isMobile?: boolean;
}

export function Sidebar({ className, isMobile = false }: SidebarProps) {
  const { data: status, isLoading } = useQuery<ApiStatus>({
    queryKey: ['/api/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div className={cn(
      "w-full lg:w-64 bg-[#2F3136] flex-shrink-0 overflow-y-auto lg:h-screen",
      isMobile && "h-screen fixed top-0 left-0 z-50",
      className
    )}>
      <div className="p-4 border-b border-[#202225]">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">ChatGPT Bot</h1>
          <div className={cn(
            "rounded-full h-3 w-3",
            isLoading ? "bg-[#FAA61A]" : 
            (status?.discord && status?.openai) ? "bg-[#43B581]" : "bg-[#F04747]"
          )} />
        </div>
        <p className="text-[#B9BBBE] text-sm mt-1">v1.0.0</p>
      </div>
      
      <div className="p-2">
        <div className="text-[#B9BBBE] text-xs uppercase font-bold tracking-wider mt-4 mb-2 px-2">Status</div>
        <div className="bg-[#42464D] rounded-md p-3 mb-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white">Discord API</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              isLoading ? "bg-[#FAA61A]" : 
              status?.discord ? "bg-[#43B581]" : "bg-[#F04747]"
            )}>
              {isLoading ? "Loading..." : (status?.discord ? "Connected" : "Disconnected")}
            </span>
          </div>
        </div>
        <div className="bg-[#42464D] rounded-md p-3 mb-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white">OpenAI API</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              isLoading ? "bg-[#FAA61A]" : 
              status?.openai ? "bg-[#43B581]" : "bg-[#F04747]"
            )}>
              {isLoading ? "Loading..." : (status?.openai ? "Connected" : "Disconnected")}
            </span>
          </div>
        </div>
        <div className="bg-[#42464D] rounded-md p-3 mb-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white">Rate Limit</span>
            <span className="text-xs text-white">
              {isLoading ? "..." : `${status?.rate_limit.used || 0}/${status?.rate_limit.total || 100} used`}
            </span>
          </div>
          <div className="w-full bg-[#202225] rounded-full h-1.5 mt-2">
            <div 
              className="bg-[#5865F2] h-1.5 rounded-full" 
              style={{ width: isLoading ? '0%' : `${status ? (status.rate_limit.used / status.rate_limit.total) * 100 : 0}%` }}
            />
          </div>
        </div>
        
        <div className="text-[#B9BBBE] text-xs uppercase font-bold tracking-wider mt-4 mb-2 px-2">Servers</div>
        {isLoading ? (
          <div className="flex items-center p-2 rounded-md bg-[#42464D] animate-pulse h-12 mb-2"></div>
        ) : (
          status?.servers.map((server) => (
            <div key={server.id} className="flex items-center p-2 rounded-md hover:bg-[#42464D] cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-[#202225] flex items-center justify-center mr-2">
                <span className="text-white">{server.name.charAt(0)}</span>
              </div>
              <span className="text-sm text-white">{server.name}</span>
              {server.alerts && server.alerts > 0 && (
                <div className="ml-auto text-xs bg-[#F04747] rounded-full w-5 h-5 flex items-center justify-center text-white">
                  {server.alerts}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="p-2 mt-auto">
        <div className="text-[#B9BBBE] text-xs uppercase font-bold tracking-wider mt-4 mb-2 px-2">Configuration</div>
        <div className="bg-[#42464D] rounded-md p-2 mb-2 text-sm cursor-pointer hover:bg-opacity-80">
          <div className="flex items-center">
            <i className="fas fa-cog mr-2 text-white"></i>
            <span className="text-white">Settings</span>
          </div>
        </div>
        <div className="bg-[#42464D] rounded-md p-2 mb-2 text-sm cursor-pointer hover:bg-opacity-80">
          <div className="flex items-center">
            <i className="fas fa-file-alt mr-2 text-white"></i>
            <span className="text-white">Logs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
