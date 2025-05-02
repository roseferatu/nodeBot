import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Conversation } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConversationMessage, apiToUiConversation } from "@/lib/types";
import { formatDate, getUserInitial, formatUsername, markdownToHTML } from "@/lib/utils";
import { RotateCw } from "lucide-react";

export function ConversationMonitor() {
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [command, setCommand] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations, isLoading, refetch } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations', { server_id: '0' }],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Convert API conversations to UI format
  const uiConversations: ConversationMessage[] = conversations
    ? conversations.map(apiToUiConversation)
    : [];

  // Get unique channels from conversations
  const channels = conversations
    ? [...new Set(conversations.map(c => c.channel_id))]
    : [];

  // Filter conversations by channel
  const filteredConversations = selectedChannel === "all"
    ? uiConversations
    : uiConversations.filter(c => c.id.toString() === selectedChannel);

  // Handle command submission
  const handleSubmitCommand = () => {
    if (!command.trim()) return;
    
    setIsSubmitting(true);
    
    // This is just for UI demonstration, as we don't have a direct connection to Discord from the browser
    setTimeout(() => {
      setCommand("");
      setIsSubmitting(false);
      refetch();
    }, 500);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmitCommand();
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [filteredConversations]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden border-r border-[#202225]">
      <div className="p-4 border-b border-[#202225] flex justify-between items-center">
        <h3 className="font-medium text-white">Conversation Monitor</h3>
        <div className="flex gap-2">
          <Select
            value={selectedChannel}
            onValueChange={setSelectedChannel}
          >
            <SelectTrigger className="bg-[#2D3136] text-[#B9BBBE] w-40">
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {channels.map(channel => (
                <SelectItem key={channel} value={channel}>
                  {channel.slice(0, 15)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="bg-[#2D3136] hover:bg-[#42464D] text-[#B9BBBE]"
          >
            <RotateCw size={16} />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 text-white" ref={chatContainerRef}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex justify-center items-center h-full text-[#B9BBBE]">
            No conversations found
          </div>
        ) : (
          filteredConversations.map((conversation, index) => (
            <div key={index}>
              {/* User Message */}
              <div className="flex mb-4">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-10 h-10 rounded-full bg-[#2D3136] flex items-center justify-center">
                    <span className="font-medium">{getUserInitial(conversation.author.username)}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline">
                    <span className="font-medium">{formatUsername(conversation.author.username)}</span>
                    <span className="text-[#B9BBBE] text-xs ml-2">{formatDate(conversation.timestamp)}</span>
                  </div>
                  <div className="mt-1 text-sm bg-[#2D3136] p-3 rounded-md">
                    {conversation.content}
                  </div>
                </div>
              </div>
              
              {/* Bot Response */}
              {conversation.response && (
                <div className="flex mb-4 ml-6">
                  <div className="flex-shrink-0 mr-3">
                    <div className={`w-10 h-10 rounded-full ${conversation.isError ? 'bg-[#F04747]' : 'bg-[#5865F2]'} flex items-center justify-center`}>
                      <i className={`fas ${conversation.isError ? 'fa-exclamation-triangle' : 'fa-robot'}`}></i>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline">
                      <span className="font-medium">{conversation.isError ? 'System' : 'ChatGPT Bot'}</span>
                      {!conversation.isError && (
                        <span className="bg-[#5865F2] text-xs px-1 ml-2 rounded">BOT</span>
                      )}
                      <span className="text-[#B9BBBE] text-xs ml-2">{formatDate(conversation.timestamp)}</span>
                    </div>
                    <div className={`mt-1 text-sm ${conversation.isError 
                      ? 'bg-[#F04747] bg-opacity-20 border border-[#F04747]' 
                      : 'bg-[#2D3136]'} p-3 rounded-md`}
                      dangerouslySetInnerHTML={{ __html: markdownToHTML(conversation.response) }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="p-4 border-t border-[#202225]">
        <div className="flex items-center">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Type a command (!ask, !chat, !help...)"
              className="w-full bg-[#2D3136] rounded-md py-2 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#5865F2] text-white"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
            />
            <button 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#B9BBBE]"
              onClick={handleSubmitCommand}
              disabled={isSubmitting}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
