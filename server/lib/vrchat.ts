import axios from 'axios';

// Types for VRChat API responses
export interface VRChatUser {
  id: string;
  displayName: string;
  username: string;
  userIcon: string;
  bio: string;
  bioLinks: string[];
  currentAvatarImageUrl: string;
  currentAvatarThumbnailImageUrl: string;
  status: string;
  statusDescription: string;
  tags: string[];
  isFriend: boolean;
  friendKey: string;
  location: string;
}

// API base URL
const BASE_URL = 'https://api.vrchat.cloud/api/1';

// Create a reusable axios instance 
const vrchatAPI = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'User-Agent': 'DiscordBot/1.0',
    'Content-Type': 'application/json',
  }
});

/**
 * Authenticate with VRChat using username and password
 * @param username VRChat username
 * @param password VRChat password
 * @returns Auth cookie if successful
 */
export async function login(username: string, password: string): Promise<string | null> {
  try {
    console.log('Attempting to log in to VRChat API...');
    const response = await vrchatAPI.get('/auth/user', {
      auth: {
        username,
        password
      }
    });
    
    // Extract auth cookie from response
    const cookies = response.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      const authCookie = cookies.find(cookie => cookie.startsWith('auth='));
      if (authCookie) {
        console.log('Successfully logged in to VRChat API');
        return authCookie;
      }
    }
    
    console.error('Failed to get auth cookie from VRChat API');
    return null;
  } catch (error) {
    console.error('Error logging in to VRChat API:', error);
    return null;
  }
}

/**
 * Set auth cookie for subsequent requests
 * @param authCookie Auth cookie from login
 */
export function setAuthCookie(authCookie: string): void {
  vrchatAPI.defaults.headers.common['Cookie'] = authCookie;
}

/**
 * Search for a user by display name or username
 * @param searchQuery Display name or username to search for
 * @returns Array of matching users
 */
export async function searchUsers(searchQuery: string): Promise<VRChatUser[]> {
  try {
    console.log(`Searching for VRChat users matching: ${searchQuery}`);
    const response = await vrchatAPI.get('/users', {
      params: {
        search: searchQuery,
        n: 5, // Limit to 5 results
      }
    });
    
    if (response.status === 200 && Array.isArray(response.data)) {
      console.log(`Found ${response.data.length} VRChat users`);
      return response.data;
    }
    
    console.error('Error in response format from VRChat API');
    return [];
  } catch (error) {
    console.error('Error searching VRChat users:', error);
    return [];
  }
}

/**
 * Get user information by username or ID
 * @param usernameOrId Username or ID to look up
 * @returns User object if found
 */
export async function getUserInfo(usernameOrId: string): Promise<VRChatUser | null> {
  try {
    console.log(`Getting VRChat user info for: ${usernameOrId}`);
    const response = await vrchatAPI.get(`/users/${usernameOrId}`);
    
    if (response.status === 200 && response.data && response.data.id) {
      console.log(`Found VRChat user: ${response.data.displayName}`);
      return response.data;
    }
    
    console.error('Error in response format from VRChat API');
    return null;
  } catch (error) {
    console.error(`Error getting VRChat user info for ${usernameOrId}:`, error);
    return null;
  }
}

/**
 * Check if the VRChat API is accessible
 * @returns True if API is accessible
 */
export async function checkVRChatStatus(): Promise<boolean> {
  try {
    console.log('Checking VRChat API status...');
    const response = await vrchatAPI.get('/');
    return response.status === 200;
  } catch (error) {
    console.error('Error checking VRChat API status:', error);
    return false;
  }
}

/**
 * Get the current status of a VRChat user
 * @param userId VRChat user ID
 * @returns Object containing status information
 */
export async function fetchVRChatUserStatus(userId: string): Promise<{
  isOnline: boolean;
  status?: string;
  worldId?: string;
  worldName?: string;
}> {
  try {
    console.log(`Fetching status for VRChat user: ${userId}`);
    const response = await vrchatAPI.get(`/users/${userId}`);
    
    if (response.status !== 200 || !response.data) {
      console.error('Error in response format from VRChat API');
      return { isOnline: false };
    }
    
    const user = response.data as VRChatUser;
    
    // Check if user is online based on status
    const isOnline = user.status !== 'offline';
    
    // Extract world information from location
    // location format can be: "offline", "private", or "worldId:instanceId"
    let worldId: string | undefined;
    let worldName: string | undefined;
    
    if (isOnline && user.location && user.location !== 'private') {
      // Parse world ID from location
      const locationParts = user.location.split(':');
      if (locationParts.length > 0) {
        worldId = locationParts[0];
        
        // Try to fetch world details if we have an ID
        if (worldId && worldId !== 'private') {
          try {
            const worldResponse = await vrchatAPI.get(`/worlds/${worldId}`);
            if (worldResponse.status === 200 && worldResponse.data) {
              worldName = worldResponse.data.name;
            }
          } catch (worldError) {
            console.error(`Error fetching world info for ${worldId}:`, worldError);
          }
        }
      }
    }
    
    return {
      isOnline,
      status: user.status,
      worldId: worldId,
      worldName: worldName
    };
  } catch (error) {
    console.error(`Error fetching VRChat user status for ${userId}:`, error);
    return { isOnline: false };
  }
}