import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a date to a readable string (Today at HH:MM)
export function formatDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date >= today) {
    return `Today at ${formatTime(date)}`;
  } else if (date >= yesterday) {
    return `Yesterday at ${formatTime(date)}`;
  } else {
    return `${date.toLocaleDateString()} at ${formatTime(date)}`;
  }
}

// Format time to 12-hour format
function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

// Get user initial from username
export function getUserInitial(username: string): string {
  return username ? username.charAt(0).toUpperCase() : 'U';
}

// Format username for display
export function formatUsername(username: string): string {
  return username || 'Unknown User';
}

// Format error message for display
export function formatErrorMessage(error: string): string {
  if (error.includes('429')) {
    return 'Rate limit exceeded. Please try again later.';
  } else if (error.includes('401')) {
    return 'Authentication error. Please check your API keys.';
  } else if (error.includes('500')) {
    return 'Server error. Please try again later.';
  } else {
    return error || 'An unknown error occurred';
  }
}

// Convert content with markdown to HTML
export function markdownToHTML(text: string): string {
  // Very basic markdown parsing for display
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}
