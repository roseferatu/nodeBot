import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, Server, AlertCircle } from "lucide-react";

interface ApiStatus {
  discord: boolean;
  openai: boolean;
  groq: boolean;
  wCounterToken?: boolean;
  uptime: number;
  rate_limit: {
    used: number;
    total: number;
    reset_in: number;
  };
  servers: {
    id: string;
    name: string;
    alerts: number;
  }[];
}

export function ApiStatusPanel() {
  // Fetch API status
  const { data: apiStatus, isLoading } = useQuery<ApiStatus>({
    queryKey: ['/api/status'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Format uptime
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Format rate limit reset time
  const formatResetTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs defaultValue="status" className="h-full flex flex-col">
        <div className="border-b border-[#202225] px-4">
          <TabsList className="mt-2 mb-2 bg-[#2D3136]">
            <TabsTrigger 
              value="status" 
              className="data-[state=active]:bg-[#5865F2] data-[state=active]:text-white"
            >
              API Status
            </TabsTrigger>
            <TabsTrigger 
              value="discord" 
              className="data-[state=active]:bg-[#5865F2] data-[state=active]:text-white"
            >
              Discord
            </TabsTrigger>
            <TabsTrigger 
              value="openai" 
              className="data-[state=active]:bg-[#5865F2] data-[state=active]:text-white"
            >
              OpenAI
            </TabsTrigger>
            <TabsTrigger 
              value="groq" 
              className="data-[state=active]:bg-[#5865F2] data-[state=active]:text-white"
            >
              Groq
            </TabsTrigger>
            <TabsTrigger 
              value="wcounter" 
              className="data-[state=active]:bg-[#5865F2] data-[state=active]:text-white"
            >
              kUShCOOKIES W Counter
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="status" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : apiStatus ? (
            <>
              <Card className="bg-[#2D3136] border-[#202225]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white flex items-center">
                    <Server className="mr-2 h-4 w-4" />
                    Service Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex justify-between items-center">
                    <span className="text-[#B9BBBE]">Discord API</span>
                    {apiStatus.discord ? (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" /> Online
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500 hover:bg-red-600">
                        <XCircle className="h-3 w-3 mr-1" /> Offline
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#B9BBBE]">OpenAI API</span>
                    {apiStatus.openai ? (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" /> Online
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500 hover:bg-red-600">
                        <XCircle className="h-3 w-3 mr-1" /> Offline
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#B9BBBE]">Groq API</span>
                    {apiStatus.groq ? (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" /> Online
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500 hover:bg-red-600">
                        <XCircle className="h-3 w-3 mr-1" /> Offline
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#B9BBBE]">kUShCOOKIES W Counter Bot</span>
                    {apiStatus.wCounterToken ? (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" /> Connected
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500 hover:bg-red-600">
                        <XCircle className="h-3 w-3 mr-1" /> Disconnected
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-[#2D3136] border-[#202225]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Bot Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex justify-between items-center">
                    <span className="text-[#B9BBBE]">Uptime</span>
                    <span className="text-white">{formatUptime(apiStatus.uptime)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#B9BBBE]">Rate Limit</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-[#36393F] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${(apiStatus.rate_limit.used / apiStatus.rate_limit.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-xs">
                        {apiStatus.rate_limit.used}/{apiStatus.rate_limit.total}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#B9BBBE]">Reset In</span>
                    <span className="text-white">{formatResetTime(apiStatus.rate_limit.reset_in)}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-[#2D3136] border-[#202225]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white flex items-center">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Servers with Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {apiStatus.servers.length === 0 ? (
                    <div className="text-[#B9BBBE] py-1">No servers with alerts</div>
                  ) : (
                    apiStatus.servers.map(server => (
                      <div key={server.id} className="flex justify-between items-center py-1">
                        <span className="text-[#B9BBBE] truncate max-w-[160px]">{server.name}</span>
                        <Badge className="bg-yellow-600 hover:bg-yellow-700">
                          {server.alerts} Alert{server.alerts !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex justify-center items-center h-full text-[#B9BBBE]">
              Failed to load status
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="discord" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          <Card className="bg-[#2D3136] border-[#202225]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-white">Discord API Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse h-32 bg-[#36393F] rounded-md"></div>
              ) : apiStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 ${apiStatus.discord ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-white">
                      {apiStatus.discord ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-[#B9BBBE] text-xs mb-1">Connected Servers</h4>
                    <div className="bg-[#36393F] p-3 rounded-md">
                      {apiStatus.servers.length} servers
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[#B9BBBE] text-xs mb-1">Bot Status</h4>
                    <div className="bg-[#36393F] p-3 rounded-md">
                      {apiStatus.discord ? 'Online and responding to commands' : 'Offline - check Discord token'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[#B9BBBE]">Failed to load Discord status</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="openai" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          <Card className="bg-[#2D3136] border-[#202225]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-white">OpenAI API Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse h-32 bg-[#36393F] rounded-md"></div>
              ) : apiStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 ${apiStatus.openai ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-white">
                      {apiStatus.openai ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-[#B9BBBE] text-xs mb-1">API Status</h4>
                    <div className="bg-[#36393F] p-3 rounded-md">
                      {apiStatus.openai 
                        ? 'API key is valid and service is responding' 
                        : 'API key may be invalid or quota exceeded'}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[#B9BBBE] text-xs mb-1">Model</h4>
                    <div className="bg-[#36393F] p-3 rounded-md">
                      gpt-4o
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[#B9BBBE]">Failed to load OpenAI status</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="groq" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          <Card className="bg-[#2D3136] border-[#202225]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-white">Groq API Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse h-32 bg-[#36393F] rounded-md"></div>
              ) : apiStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 ${apiStatus.groq ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-white">
                      {apiStatus.groq ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-[#B9BBBE] text-xs mb-1">API Status</h4>
                    <div className="bg-[#36393F] p-3 rounded-md">
                      {apiStatus.groq 
                        ? 'API key is valid and service is responding' 
                        : 'API key may be invalid or service unavailable'}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[#B9BBBE] text-xs mb-1">Fallback Active</h4>
                    <div className="bg-[#36393F] p-3 rounded-md">
                      {!apiStatus.openai && apiStatus.groq 
                        ? 'Yes - Groq is handling AI requests while OpenAI is unavailable' 
                        : 'No - Using primary OpenAI service'}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[#B9BBBE] text-xs mb-1">Model</h4>
                    <div className="bg-[#36393F] p-3 rounded-md">
                      groq-llama3-8B-8192
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[#B9BBBE]">Failed to load Groq status</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="wcounter" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          <Card className="bg-[#2D3136] border-[#202225]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-white">kUShCOOKIES W Counter Bot Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse h-32 bg-[#36393F] rounded-md"></div>
              ) : apiStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 ${apiStatus.wCounterToken ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-white">
                      {apiStatus.wCounterToken ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-[#B9BBBE] text-xs mb-1">Bot Status</h4>
                    <div className="bg-[#36393F] p-3 rounded-md">
                      {apiStatus.wCounterToken 
                        ? 'kUShCOOKIES W Counter bot is online and tracking W occurrences in Discord channels' 
                        : 'kUShCOOKIES W Counter bot is offline - check W_COUNTER_TOKEN'}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[#B9BBBE] text-xs mb-1">Integration Type</h4>
                    <div className="bg-[#36393F] p-3 rounded-md">
                      WebSocket-based integration with main server
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[#B9BBBE] text-xs mb-1">Bot Commands</h4>
                    <div className="bg-[#36393F] p-3 rounded-md">
                      <p className="text-white mb-2">/count - Shows current W counts for this channel and server</p>
                      <p className="text-white">!reset - Resets all W counters for the current server</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[#B9BBBE]">Failed to load kUShCOOKIES W Counter status</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}