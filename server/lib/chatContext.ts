import { ChatMessage } from './openai';
import { storage } from '../storage';

// Convert database conversations to ChatGPT message format
export async function getConversationContext(
  serverId: string,
  channelId: string,
  userId: string,
  limit = 5
): Promise<ChatMessage[]> {
  // Get recent conversations from storage
  const conversations = await storage.getConversationContext(
    serverId,
    channelId,
    userId,
    limit
  );
  
  // Convert to ChatGPT message format
  const messages: ChatMessage[] = [];
  
  for (const conv of conversations) {
    // Skip error messages in context
    if (conv.is_error) continue;
    
    // Add user message
    messages.push({
      role: 'user',
      content: conv.message.replace(/^!\w+\s+/, '') // Remove command prefix
    });
    
    // Add assistant response if available
    if (conv.response) {
      messages.push({
        role: 'assistant',
        content: conv.response
      });
    }
  }
  
  return messages;
}

// Clear conversation context
export async function clearConversationContext(
  serverId: string,
  channelId: string,
  userId: string
): Promise<void> {
  // This is a no-op in our implementation since we're retrieving context on demand
  // In a real implementation with persistent storage, you'd delete the records
  console.log(`Clearing context for user ${userId} in channel ${channelId} on server ${serverId}`);
}
