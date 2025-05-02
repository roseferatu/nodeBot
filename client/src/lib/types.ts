import { ApiStatus, Conversation, Server } from "@shared/schema";

// Discord message types for UI
export interface MessageAuthor {
  id: string;
  username: string;
  isBot: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  author: MessageAuthor;
  timestamp: Date;
  isError?: boolean;
  errorCode?: string;
}

// Conversation type for UI
export interface ConversationMessage {
  id: number;
  author: {
    id: string;
    username: string;
    isBot: boolean;
  };
  content: string;
  response?: string;
  timestamp: Date;
  isError?: boolean;
  errorMessage?: string;
}

// Convert API conversation to UI conversation
export function apiToUiConversation(conversation: Conversation): ConversationMessage {
  return {
    id: conversation.id,
    author: {
      id: conversation.user_id,
      username: conversation.username,
      isBot: false
    },
    content: conversation.message,
    response: conversation.response,
    timestamp: new Date(conversation.created_at),
    isError: conversation.is_error,
    errorMessage: conversation.error_message
  };
}

// Command documentation
export interface Command {
  name: string;
  description: string;
  example: string;
  isAdmin?: boolean;
}

export const COMMANDS: Command[] = [
  {
    name: "!ask [question]",
    description: "Get a straightforward answer to a question",
    example: "!ask What is Node.js?"
  },
  {
    name: "!chat [message]",
    description: "Have a conversation with the ChatGPT bot",
    example: "!chat Tell me about space exploration"
  },
  {
    name: "!help",
    description: "Display all available commands",
    example: "!help"
  },
  {
    name: "!continue",
    description: "Continue a previous response if it was cut off",
    example: "!continue"
  },
  {
    name: "!clear",
    description: "Clear the current conversation context",
    example: "!clear"
  },
  {
    name: "!config [setting] [value]",
    description: "Change bot settings (Admin only)",
    example: "!config rateLimit 50",
    isAdmin: true
  },
  {
    name: "!stats",
    description: "View bot statistics (Admin only)",
    example: "!stats",
    isAdmin: true
  },
  {
    name: "!restart",
    description: "Restart the bot (Admin only)",
    example: "!restart",
    isAdmin: true
  }
];
