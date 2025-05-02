import { 
  users, type User, type InsertUser,
  servers, type Server, type InsertServer,
  conversations, type Conversation, type InsertConversation,
  rateLimits, type RateLimit, type InsertRateLimit,
  botSettings, type BotSettings, type InsertBotSettings,
  linkedAccounts, type LinkedAccount, type InsertLinkedAccount,
  strains, type Strain, type InsertStrain,
  strainAnnouncements, type StrainAnnouncement, type InsertStrainAnnouncement,
  timeTrackingSessions, type TimeTrackingSession, type InsertTimeTrackingSession,
  timeTrackingSummaries, type TimeTrackingSummary, type InsertTimeTrackingSummary,
  timeTrackingSettings, type TimeTrackingSettings, type InsertTimeTrackingSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Server methods
  getServer(id: string): Promise<Server | undefined>;
  getServers(): Promise<Server[]>;
  createServer(server: InsertServer): Promise<Server>;
  
  // Conversation methods
  getConversations(serverId: string, channelId?: string, limit?: number): Promise<Conversation[]>;
  getConversationContext(serverId: string, channelId: string, userId: string, limit?: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  
  // Rate limit methods
  getRateLimit(userId: string, serverId: string): Promise<RateLimit | undefined>;
  incrementRateLimit(userId: string, serverId: string, countToAdd?: number): Promise<RateLimit>;
  resetRateLimit(userId: string, serverId: string): Promise<RateLimit>;
  
  // Bot settings methods
  getBotSettings(serverId: string): Promise<BotSettings | undefined>;
  updateBotSettings(serverId: string, settings: any): Promise<BotSettings>;
  
  // Linked account methods
  getLinkedAccount(discordUserId: string): Promise<LinkedAccount | undefined>;
  getLinkedAccountByVRChatId(vrchatUserId: string): Promise<LinkedAccount | undefined>;
  getLinkedAccountsByServer(serverId: string): Promise<LinkedAccount[]>;
  createLinkedAccount(account: InsertLinkedAccount): Promise<LinkedAccount>;
  updateLinkedAccount(discordUserId: string, data: Partial<InsertLinkedAccount>): Promise<LinkedAccount>;
  deleteLinkedAccount(discordUserId: string): Promise<boolean>;
  
  // Strain methods for kUShCOOKIES Strain of the Day
  getStrains(): Promise<Strain[]>; 
  getStrainById(id: number): Promise<Strain | undefined>;
  getRandomStrain(): Promise<Strain | undefined>;
  createStrain(strain: InsertStrain): Promise<Strain>;
  updateStrain(id: number, data: Partial<InsertStrain>): Promise<Strain>;
  deleteStrain(id: number): Promise<boolean>;
  
  // Strain announcement methods
  getStrainAnnouncements(serverId: string): Promise<StrainAnnouncement[]>;
  getStrainAnnouncementById(id: number): Promise<StrainAnnouncement | undefined>;
  createStrainAnnouncement(announcement: InsertStrainAnnouncement): Promise<StrainAnnouncement>;
  updateStrainAnnouncement(id: number, data: Partial<InsertStrainAnnouncement>): Promise<StrainAnnouncement>;
  deleteStrainAnnouncement(id: number): Promise<boolean>;
  getPendingAnnouncements(): Promise<StrainAnnouncement[]>;
  updateLastAnnounced(id: number, timestamp: Date): Promise<StrainAnnouncement>;
  
  // Time tracking methods - Sessions
  getTimeTrackingSession(id: number): Promise<TimeTrackingSession | undefined>;
  getActiveSessionByLinkedAccount(linkedAccountId: number): Promise<TimeTrackingSession | undefined>;
  getSessionsByLinkedAccount(linkedAccountId: number, limit?: number): Promise<TimeTrackingSession[]>;
  getSessionsByServer(serverId: string, limit?: number): Promise<TimeTrackingSession[]>;
  createTimeTrackingSession(session: InsertTimeTrackingSession): Promise<TimeTrackingSession>;
  updateTimeTrackingSession(id: number, data: Partial<TimeTrackingSession>): Promise<TimeTrackingSession>;
  closeTimeTrackingSession(id: number, endTime: Date): Promise<TimeTrackingSession>;
  
  // Time tracking methods - Summaries
  getTimeTrackingSummary(id: number): Promise<TimeTrackingSummary | undefined>;
  getSummariesByLinkedAccount(linkedAccountId: number, summaryType: string, limit?: number): Promise<TimeTrackingSummary[]>;
  getSummariesByServer(serverId: string, summaryType: string, limit?: number): Promise<TimeTrackingSummary[]>;
  createTimeTrackingSummary(summary: InsertTimeTrackingSummary): Promise<TimeTrackingSummary>;
  updateTimeTrackingSummary(id: number, data: Partial<TimeTrackingSummary>): Promise<TimeTrackingSummary>;
  getLatestSummary(linkedAccountId: number, summaryType: string): Promise<TimeTrackingSummary | undefined>;
  
  // Time tracking methods - Settings
  getTimeTrackingSettings(serverId: string): Promise<TimeTrackingSettings | undefined>;
  createTimeTrackingSettings(settings: InsertTimeTrackingSettings): Promise<TimeTrackingSettings>;
  updateTimeTrackingSettings(serverId: string, data: Partial<TimeTrackingSettings>): Promise<TimeTrackingSettings>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private servers: Map<string, Server>;
  private conversations: Conversation[];
  private rateLimits: Map<string, RateLimit>;
  private settings: Map<string, BotSettings>;
  private linkedAccounts: Map<string, LinkedAccount>;
  private timeTrackingSessions: Map<number, TimeTrackingSession>;
  private timeTrackingSummaries: Map<number, TimeTrackingSummary>;
  private timeTrackingSettings: Map<string, TimeTrackingSettings>;
  
  private userCurrentId: number;
  private conversationCurrentId: number;
  private rateLimitCurrentId: number;
  private settingsCurrentId: number;
  private linkedAccountCurrentId: number;
  private timeTrackingSessionCurrentId: number;
  private timeTrackingSummaryCurrentId: number;
  private timeTrackingSettingsCurrentId: number;

  constructor() {
    this.users = new Map();
    this.servers = new Map();
    this.conversations = [];
    this.rateLimits = new Map();
    this.settings = new Map();
    this.linkedAccounts = new Map();
    this.timeTrackingSessions = new Map();
    this.timeTrackingSummaries = new Map();
    this.timeTrackingSettings = new Map();
    
    this.userCurrentId = 1;
    this.conversationCurrentId = 1;
    this.rateLimitCurrentId = 1;
    this.settingsCurrentId = 1;
    this.linkedAccountCurrentId = 1;
    this.timeTrackingSessionCurrentId = 1;
    this.timeTrackingSummaryCurrentId = 1;
    this.timeTrackingSettingsCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Server methods
  async getServer(id: string): Promise<Server | undefined> {
    return this.servers.get(id);
  }
  
  async getServers(): Promise<Server[]> {
    return Array.from(this.servers.values());
  }
  
  async createServer(server: InsertServer): Promise<Server> {
    this.servers.set(server.id, server as Server);
    return server as Server;
  }
  
  // Conversation methods
  async getConversations(serverId: string, channelId?: string, limit = 50): Promise<Conversation[]> {
    let filtered = this.conversations.filter(c => c.server_id === serverId);
    
    if (channelId) {
      filtered = filtered.filter(c => c.channel_id === channelId);
    }
    
    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, limit);
  }
  
  async getConversationContext(serverId: string, channelId: string, userId: string, limit = 10): Promise<Conversation[]> {
    return this.conversations
      .filter(c => c.server_id === serverId && c.channel_id === channelId && c.user_id === userId)
      .sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .slice(-limit);
  }
  
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationCurrentId++;
    const created_at = new Date();
    
    // Ensure nullable fields are properly set
    const conversation: Conversation = {
      ...insertConversation,
      id,
      created_at,
      response: insertConversation.response || null,
      is_error: insertConversation.is_error || false,
      error_message: insertConversation.error_message || null
    };
    
    this.conversations.push(conversation);
    return conversation;
  }
  
  // Rate limit methods
  async getRateLimit(userId: string, serverId: string): Promise<RateLimit | undefined> {
    const key = `${userId}:${serverId}`;
    return this.rateLimits.get(key);
  }
  
  async incrementRateLimit(userId: string, serverId: string, countToAdd: number = 1): Promise<RateLimit> {
    const key = `${userId}:${serverId}`;
    let rateLimit = this.rateLimits.get(key);
    
    if (!rateLimit) {
      // Initialize with one hour expiry
      const reset_at = new Date();
      reset_at.setHours(reset_at.getHours() + 1);
      
      rateLimit = {
        id: this.rateLimitCurrentId++,
        user_id: userId,
        server_id: serverId,
        count: 0,
        reset_at
      };
    }
    
    // Check if reset time has passed
    if (new Date() > rateLimit.reset_at) {
      const reset_at = new Date();
      reset_at.setHours(reset_at.getHours() + 1);
      
      rateLimit = {
        ...rateLimit,
        count: 0,
        reset_at
      };
    }
    
    // Increment count by specified amount
    rateLimit.count += countToAdd;
    this.rateLimits.set(key, rateLimit);
    
    return rateLimit;
  }
  
  async resetRateLimit(userId: string, serverId: string): Promise<RateLimit> {
    const key = `${userId}:${serverId}`;
    let rateLimit = this.rateLimits.get(key);
    
    if (!rateLimit) {
      const reset_at = new Date();
      reset_at.setHours(reset_at.getHours() + 1);
      
      rateLimit = {
        id: this.rateLimitCurrentId++,
        user_id: userId,
        server_id: serverId,
        count: 0,
        reset_at
      };
    } else {
      const reset_at = new Date();
      reset_at.setHours(reset_at.getHours() + 1);
      
      rateLimit = {
        ...rateLimit,
        count: 0,
        reset_at
      };
    }
    
    this.rateLimits.set(key, rateLimit);
    return rateLimit;
  }
  
  // Bot settings methods
  async getBotSettings(serverId: string): Promise<BotSettings | undefined> {
    return this.settings.get(serverId);
  }
  
  async updateBotSettings(serverId: string, settingsObj: any): Promise<BotSettings> {
    let botSettings = this.settings.get(serverId);
    
    if (!botSettings) {
      botSettings = {
        id: this.settingsCurrentId++,
        server_id: serverId,
        settings: settingsObj,
        updated_at: new Date()
      };
    } else {
      botSettings = {
        ...botSettings,
        settings: settingsObj,
        updated_at: new Date()
      };
    }
    
    this.settings.set(serverId, botSettings);
    return botSettings;
  }
  
  // Linked account methods
  async getLinkedAccount(discordUserId: string): Promise<LinkedAccount | undefined> {
    return Array.from(this.linkedAccounts.values()).find(
      (account) => account.discord_user_id === discordUserId
    );
  }
  
  async getLinkedAccountByVRChatId(vrchatUserId: string): Promise<LinkedAccount | undefined> {
    return Array.from(this.linkedAccounts.values()).find(
      (account) => account.vrchat_user_id === vrchatUserId
    );
  }
  
  async getLinkedAccountsByServer(serverId: string): Promise<LinkedAccount[]> {
    return Array.from(this.linkedAccounts.values()).filter(
      (account) => account.server_id === serverId
    );
  }
  
  async createLinkedAccount(account: InsertLinkedAccount): Promise<LinkedAccount> {
    const id = this.linkedAccountCurrentId++;
    const created_at = new Date();
    const updated_at = new Date();
    
    const linkedAccount: LinkedAccount = {
      ...account,
      id,
      created_at,
      updated_at,
      verification_code: account.verification_code || null,
      verified: account.verified || false
    };
    
    this.linkedAccounts.set(account.discord_user_id, linkedAccount);
    return linkedAccount;
  }
  
  async updateLinkedAccount(discordUserId: string, data: Partial<InsertLinkedAccount>): Promise<LinkedAccount> {
    const account = await this.getLinkedAccount(discordUserId);
    
    if (!account) {
      throw new Error(`Linked account with Discord user ID ${discordUserId} not found`);
    }
    
    const updatedAccount: LinkedAccount = {
      ...account,
      ...data,
      updated_at: new Date()
    };
    
    this.linkedAccounts.set(discordUserId, updatedAccount);
    return updatedAccount;
  }
  
  async deleteLinkedAccount(discordUserId: string): Promise<boolean> {
    return this.linkedAccounts.delete(discordUserId);
  }
  
  // Strain storage for kUShCOOKIES Strain of the Day
  private strains: Map<number, Strain> = new Map();
  private strainAnnouncements: Map<number, StrainAnnouncement> = new Map();
  private strainCurrentId: number = 1;
  private strainAnnouncementCurrentId: number = 1;
  
  // Strain methods
  async getStrains(): Promise<Strain[]> {
    return Array.from(this.strains.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  async getStrainById(id: number): Promise<Strain | undefined> {
    return this.strains.get(id);
  }
  
  async getRandomStrain(): Promise<Strain | undefined> {
    const allStrains = Array.from(this.strains.values());
    if (allStrains.length === 0) return undefined;
    
    const randomIndex = Math.floor(Math.random() * allStrains.length);
    return allStrains[randomIndex];
  }
  
  async createStrain(strain: InsertStrain): Promise<Strain> {
    const id = this.strainCurrentId++;
    const created_at = new Date();
    
    // Make sure optional fields are null and not undefined
    const newStrain: Strain = {
      id,
      name: strain.name,
      type: strain.type,
      description: strain.description,
      created_at,
      effects: strain.effects || null,
      thc_content: strain.thc_content || null,
      cbd_content: strain.cbd_content || null,
      flavor_profile: strain.flavor_profile || null,
      image_url: strain.image_url || null
    };
    
    this.strains.set(id, newStrain);
    return newStrain;
  }
  
  async updateStrain(id: number, data: Partial<InsertStrain>): Promise<Strain> {
    const strain = this.strains.get(id);
    if (!strain) {
      throw new Error(`Strain with ID ${id} not found`);
    }
    
    const updatedStrain: Strain = {
      ...strain,
      ...data
    };
    
    this.strains.set(id, updatedStrain);
    return updatedStrain;
  }
  
  async deleteStrain(id: number): Promise<boolean> {
    return this.strains.delete(id);
  }
  
  // Strain announcement methods
  async getStrainAnnouncements(serverId: string): Promise<StrainAnnouncement[]> {
    return Array.from(this.strainAnnouncements.values())
      .filter(a => a.server_id === serverId)
      .sort((a, b) => {
        const dateA = a.created_at instanceof Date ? a.created_at : new Date(a.created_at as any);
        const dateB = b.created_at instanceof Date ? b.created_at : new Date(b.created_at as any);
        return dateA.getTime() - dateB.getTime();
      });
  }
  
  async getStrainAnnouncementById(id: number): Promise<StrainAnnouncement | undefined> {
    return this.strainAnnouncements.get(id);
  }
  
  async createStrainAnnouncement(announcement: InsertStrainAnnouncement): Promise<StrainAnnouncement> {
    const id = this.strainAnnouncementCurrentId++;
    const created_at = new Date();
    
    // Make sure all fields are properly set to avoid TypeScript errors
    const newAnnouncement: StrainAnnouncement = {
      id,
      server_id: announcement.server_id,
      channel_id: announcement.channel_id,
      time: announcement.time,
      created_at,
      timezone: announcement.timezone || null,
      is_enabled: announcement.is_enabled !== undefined ? announcement.is_enabled : true,
      last_announced: null
    };
    
    this.strainAnnouncements.set(id, newAnnouncement);
    return newAnnouncement;
  }
  
  async updateStrainAnnouncement(id: number, data: Partial<InsertStrainAnnouncement>): Promise<StrainAnnouncement> {
    const announcement = this.strainAnnouncements.get(id);
    if (!announcement) {
      throw new Error(`Strain announcement with ID ${id} not found`);
    }
    
    const updatedAnnouncement: StrainAnnouncement = {
      ...announcement,
      ...data
    };
    
    this.strainAnnouncements.set(id, updatedAnnouncement);
    return updatedAnnouncement;
  }
  
  async deleteStrainAnnouncement(id: number): Promise<boolean> {
    return this.strainAnnouncements.delete(id);
  }
  
  async getPendingAnnouncements(): Promise<StrainAnnouncement[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return Array.from(this.strainAnnouncements.values())
      .filter(a => a.is_enabled && (!a.last_announced || (a.last_announced && new Date(a.last_announced) < today)));
  }
  
  async updateLastAnnounced(id: number, timestamp: Date): Promise<StrainAnnouncement> {
    const announcement = this.strainAnnouncements.get(id);
    if (!announcement) {
      throw new Error(`Strain announcement with ID ${id} not found`);
    }
    
    const updatedAnnouncement: StrainAnnouncement = {
      ...announcement,
      last_announced: timestamp
    };
    
    this.strainAnnouncements.set(id, updatedAnnouncement);
    return updatedAnnouncement;
  }
  
  // Time tracking methods - Sessions
  async getTimeTrackingSession(id: number): Promise<TimeTrackingSession | undefined> {
    return this.timeTrackingSessions.get(id);
  }
  
  async getActiveSessionByLinkedAccount(linkedAccountId: number): Promise<TimeTrackingSession | undefined> {
    return Array.from(this.timeTrackingSessions.values()).find(
      session => session.linked_account_id === linkedAccountId && session.is_active
    );
  }
  
  async getSessionsByLinkedAccount(linkedAccountId: number, limit = 50): Promise<TimeTrackingSession[]> {
    return Array.from(this.timeTrackingSessions.values())
      .filter(session => session.linked_account_id === linkedAccountId)
      .sort((a, b) => new Date(b.session_start).getTime() - new Date(a.session_start).getTime())
      .slice(0, limit);
  }
  
  async getSessionsByServer(serverId: string, limit = 50): Promise<TimeTrackingSession[]> {
    return Array.from(this.timeTrackingSessions.values())
      .filter(session => session.server_id === serverId)
      .sort((a, b) => new Date(b.session_start).getTime() - new Date(a.session_start).getTime())
      .slice(0, limit);
  }
  
  async createTimeTrackingSession(session: InsertTimeTrackingSession): Promise<TimeTrackingSession> {
    const id = this.timeTrackingSessionCurrentId++;
    const created_at = new Date();
    
    // Explicit type casting to ensure all fields are properly handled
    const newSession: TimeTrackingSession = {
      id,
      server_id: session.server_id,
      linked_account_id: session.linked_account_id,
      created_at,
      session_start: session.session_start,
      session_end: null,
      duration_minutes: null,
      status: session.status || null,
      world_id: session.world_id || null,
      world_name: session.world_name || null,
      is_active: true
    };
    
    this.timeTrackingSessions.set(id, newSession);
    return newSession;
  }
  
  async updateTimeTrackingSession(id: number, data: Partial<TimeTrackingSession>): Promise<TimeTrackingSession> {
    const session = this.timeTrackingSessions.get(id);
    if (!session) {
      throw new Error(`Time tracking session with ID ${id} not found`);
    }
    
    const updatedSession: TimeTrackingSession = {
      ...session,
      ...data
    };
    
    this.timeTrackingSessions.set(id, updatedSession);
    return updatedSession;
  }
  
  async closeTimeTrackingSession(id: number, endTime: Date): Promise<TimeTrackingSession> {
    const session = this.timeTrackingSessions.get(id);
    if (!session) {
      throw new Error(`Time tracking session with ID ${id} not found`);
    }
    
    // Calculate duration in minutes
    const startTime = new Date(session.session_start);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    const updatedSession: TimeTrackingSession = {
      ...session,
      session_end: endTime,
      duration_minutes: durationMinutes,
      is_active: false
    };
    
    this.timeTrackingSessions.set(id, updatedSession);
    return updatedSession;
  }
  
  // Time tracking methods - Summaries
  async getTimeTrackingSummary(id: number): Promise<TimeTrackingSummary | undefined> {
    return this.timeTrackingSummaries.get(id);
  }
  
  async getSummariesByLinkedAccount(linkedAccountId: number, summaryType: string, limit = 10): Promise<TimeTrackingSummary[]> {
    return Array.from(this.timeTrackingSummaries.values())
      .filter(summary => summary.linked_account_id === linkedAccountId && summary.summary_type === summaryType)
      .sort((a, b) => new Date(b.summary_date).getTime() - new Date(a.summary_date).getTime())
      .slice(0, limit);
  }
  
  async getSummariesByServer(serverId: string, summaryType: string, limit = 50): Promise<TimeTrackingSummary[]> {
    return Array.from(this.timeTrackingSummaries.values())
      .filter(summary => summary.server_id === serverId && summary.summary_type === summaryType)
      .sort((a, b) => new Date(b.summary_date).getTime() - new Date(a.summary_date).getTime())
      .slice(0, limit);
  }
  
  async createTimeTrackingSummary(summary: InsertTimeTrackingSummary): Promise<TimeTrackingSummary> {
    const id = this.timeTrackingSummaryCurrentId++;
    const created_at = new Date();
    const updated_at = new Date();
    
    const newSummary: TimeTrackingSummary = {
      ...summary,
      id,
      created_at,
      updated_at,
      total_minutes: summary.total_minutes || 0,
      active_sessions: summary.active_sessions || 0,
      worlds_visited: summary.worlds_visited || 0,
      worlds_data: summary.worlds_data || null
    };
    
    this.timeTrackingSummaries.set(id, newSummary);
    return newSummary;
  }
  
  async updateTimeTrackingSummary(id: number, data: Partial<TimeTrackingSummary>): Promise<TimeTrackingSummary> {
    const summary = this.timeTrackingSummaries.get(id);
    if (!summary) {
      throw new Error(`Time tracking summary with ID ${id} not found`);
    }
    
    const updatedSummary: TimeTrackingSummary = {
      ...summary,
      ...data,
      updated_at: new Date()
    };
    
    this.timeTrackingSummaries.set(id, updatedSummary);
    return updatedSummary;
  }
  
  async getLatestSummary(linkedAccountId: number, summaryType: string): Promise<TimeTrackingSummary | undefined> {
    return Array.from(this.timeTrackingSummaries.values())
      .filter(summary => summary.linked_account_id === linkedAccountId && summary.summary_type === summaryType)
      .sort((a, b) => new Date(b.summary_date).getTime() - new Date(a.summary_date).getTime())[0];
  }
  
  // Time tracking methods - Settings
  async getTimeTrackingSettings(serverId: string): Promise<TimeTrackingSettings | undefined> {
    return this.timeTrackingSettings.get(serverId);
  }
  
  async createTimeTrackingSettings(settings: InsertTimeTrackingSettings): Promise<TimeTrackingSettings> {
    const id = this.timeTrackingSettingsCurrentId++;
    const created_at = new Date();
    const updated_at = new Date();
    
    const newSettings: TimeTrackingSettings = {
      ...settings,
      id,
      created_at,
      updated_at,
      enabled: settings.enabled ?? true,
      track_worlds: settings.track_worlds ?? true,
      check_interval_minutes: settings.check_interval_minutes ?? 5,
      milestone_roles: settings.milestone_roles || null,
      notification_channel_id: settings.notification_channel_id || null,
      milestone_notifications: settings.milestone_notifications ?? true
    };
    
    this.timeTrackingSettings.set(settings.server_id, newSettings);
    return newSettings;
  }
  
  async updateTimeTrackingSettings(serverId: string, data: Partial<TimeTrackingSettings>): Promise<TimeTrackingSettings> {
    const settings = this.timeTrackingSettings.get(serverId);
    if (!settings) {
      throw new Error(`Time tracking settings for server ${serverId} not found`);
    }
    
    const updatedSettings: TimeTrackingSettings = {
      ...settings,
      ...data,
      updated_at: new Date()
    };
    
    this.timeTrackingSettings.set(serverId, updatedSettings);
    return updatedSettings;
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Server methods
  async getServer(id: string): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.id, id));
    return server || undefined;
  }
  
  async getServers(): Promise<Server[]> {
    return await db.select().from(servers);
  }
  
  async createServer(server: InsertServer): Promise<Server> {
    // Check if server already exists
    const existing = await this.getServer(server.id);
    if (existing) {
      return existing;
    }
    
    const [newServer] = await db.insert(servers).values(server).returning();
    return newServer;
  }
  
  // Strain methods for kUShCOOKIES Strain of the Day
  async getStrains(): Promise<Strain[]> {
    return await db.select().from(strains).orderBy(asc(strains.name));
  }
  
  async getStrainById(id: number): Promise<Strain | undefined> {
    const [strain] = await db.select().from(strains).where(eq(strains.id, id));
    return strain || undefined;
  }
  
  async getRandomStrain(): Promise<Strain | undefined> {
    // Get all strains
    const allStrains = await this.getStrains();
    
    // Return a random strain if any exist
    if (allStrains.length > 0) {
      const randomIndex = Math.floor(Math.random() * allStrains.length);
      return allStrains[randomIndex];
    }
    
    return undefined;
  }
  
  async createStrain(strain: InsertStrain): Promise<Strain> {
    const [newStrain] = await db.insert(strains).values(strain).returning();
    return newStrain;
  }
  
  async updateStrain(id: number, data: Partial<InsertStrain>): Promise<Strain> {
    const [updatedStrain] = await db
      .update(strains)
      .set(data)
      .where(eq(strains.id, id))
      .returning();
      
    if (!updatedStrain) {
      throw new Error(`Strain with ID ${id} not found`);
    }
    
    return updatedStrain;
  }
  
  async deleteStrain(id: number): Promise<boolean> {
    const result = await db
      .delete(strains)
      .where(eq(strains.id, id))
      .returning();
      
    return result.length > 0;
  }
  
  // Strain announcement methods
  async getStrainAnnouncements(serverId: string): Promise<StrainAnnouncement[]> {
    return await db
      .select()
      .from(strainAnnouncements)
      .where(eq(strainAnnouncements.server_id, serverId))
      .orderBy(asc(strainAnnouncements.created_at));
  }
  
  async getStrainAnnouncementById(id: number): Promise<StrainAnnouncement | undefined> {
    const [announcement] = await db
      .select()
      .from(strainAnnouncements)
      .where(eq(strainAnnouncements.id, id));
      
    return announcement || undefined;
  }
  
  async createStrainAnnouncement(announcement: InsertStrainAnnouncement): Promise<StrainAnnouncement> {
    const [newAnnouncement] = await db
      .insert(strainAnnouncements)
      .values(announcement)
      .returning();
      
    return newAnnouncement;
  }
  
  async updateStrainAnnouncement(id: number, data: Partial<InsertStrainAnnouncement>): Promise<StrainAnnouncement> {
    const [updatedAnnouncement] = await db
      .update(strainAnnouncements)
      .set(data)
      .where(eq(strainAnnouncements.id, id))
      .returning();
      
    if (!updatedAnnouncement) {
      throw new Error(`Strain announcement with ID ${id} not found`);
    }
    
    return updatedAnnouncement;
  }
  
  async deleteStrainAnnouncement(id: number): Promise<boolean> {
    const result = await db
      .delete(strainAnnouncements)
      .where(eq(strainAnnouncements.id, id))
      .returning();
      
    return result.length > 0;
  }
  
  async getPendingAnnouncements(): Promise<StrainAnnouncement[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get all enabled announcements
    const announcements = await db
      .select()
      .from(strainAnnouncements)
      .where(eq(strainAnnouncements.is_enabled, true));
      
    // Filter for announcements that haven't run today
    return announcements.filter(announcement => {
      // If last_announced is null or before today, it's pending
      return !announcement.last_announced || (announcement.last_announced && new Date(announcement.last_announced) < today);
    });
  }
  
  async updateLastAnnounced(id: number, timestamp: Date): Promise<StrainAnnouncement> {
    const [updatedAnnouncement] = await db
      .update(strainAnnouncements)
      .set({ last_announced: timestamp })
      .where(eq(strainAnnouncements.id, id))
      .returning();
      
    if (!updatedAnnouncement) {
      throw new Error(`Strain announcement with ID ${id} not found`);
    }
    
    return updatedAnnouncement;
  }
  
  // Time tracking methods - Sessions
  async getTimeTrackingSession(id: number): Promise<TimeTrackingSession | undefined> {
    const [session] = await db
      .select()
      .from(timeTrackingSessions)
      .where(eq(timeTrackingSessions.id, id));
      
    return session || undefined;
  }
  
  async getActiveSessionByLinkedAccount(linkedAccountId: number): Promise<TimeTrackingSession | undefined> {
    const [session] = await db
      .select()
      .from(timeTrackingSessions)
      .where(and(
        eq(timeTrackingSessions.linked_account_id, linkedAccountId),
        eq(timeTrackingSessions.is_active, true)
      ));
      
    return session || undefined;
  }
  
  async getSessionsByLinkedAccount(linkedAccountId: number, limit = 50): Promise<TimeTrackingSession[]> {
    return await db
      .select()
      .from(timeTrackingSessions)
      .where(eq(timeTrackingSessions.linked_account_id, linkedAccountId))
      .orderBy(desc(timeTrackingSessions.session_start))
      .limit(limit);
  }
  
  async getSessionsByServer(serverId: string, limit = 50): Promise<TimeTrackingSession[]> {
    return await db
      .select()
      .from(timeTrackingSessions)
      .where(eq(timeTrackingSessions.server_id, serverId))
      .orderBy(desc(timeTrackingSessions.session_start))
      .limit(limit);
  }
  
  async createTimeTrackingSession(session: InsertTimeTrackingSession): Promise<TimeTrackingSession> {
    const [newSession] = await db
      .insert(timeTrackingSessions)
      .values({ 
        ...session, 
        is_active: true
      })
      .returning();
      
    return newSession;
  }
  
  async updateTimeTrackingSession(id: number, data: Partial<TimeTrackingSession>): Promise<TimeTrackingSession> {
    const [updatedSession] = await db
      .update(timeTrackingSessions)
      .set(data)
      .where(eq(timeTrackingSessions.id, id))
      .returning();
      
    if (!updatedSession) {
      throw new Error(`Time tracking session with ID ${id} not found`);
    }
    
    return updatedSession;
  }
  
  async closeTimeTrackingSession(id: number, endTime: Date): Promise<TimeTrackingSession> {
    // Get the session to calculate duration
    const session = await this.getTimeTrackingSession(id);
    if (!session) {
      throw new Error(`Time tracking session with ID ${id} not found`);
    }
    
    // Calculate duration in minutes
    const startTime = new Date(session.session_start);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    // Update the session with end time and duration
    const [updatedSession] = await db
      .update(timeTrackingSessions)
      .set({
        session_end: endTime,
        duration_minutes: durationMinutes,
        is_active: false
      })
      .where(eq(timeTrackingSessions.id, id))
      .returning();
      
    return updatedSession;
  }
  
  // Time tracking methods - Summaries
  async getTimeTrackingSummary(id: number): Promise<TimeTrackingSummary | undefined> {
    const [summary] = await db
      .select()
      .from(timeTrackingSummaries)
      .where(eq(timeTrackingSummaries.id, id));
      
    return summary || undefined;
  }
  
  async getSummariesByLinkedAccount(linkedAccountId: number, summaryType: string, limit = 10): Promise<TimeTrackingSummary[]> {
    return await db
      .select()
      .from(timeTrackingSummaries)
      .where(and(
        eq(timeTrackingSummaries.linked_account_id, linkedAccountId),
        eq(timeTrackingSummaries.summary_type, summaryType)
      ))
      .orderBy(desc(timeTrackingSummaries.summary_date))
      .limit(limit);
  }
  
  async getSummariesByServer(serverId: string, summaryType: string, limit = 50): Promise<TimeTrackingSummary[]> {
    return await db
      .select()
      .from(timeTrackingSummaries)
      .where(and(
        eq(timeTrackingSummaries.server_id, serverId),
        eq(timeTrackingSummaries.summary_type, summaryType)
      ))
      .orderBy(desc(timeTrackingSummaries.summary_date))
      .limit(limit);
  }
  
  async createTimeTrackingSummary(summary: InsertTimeTrackingSummary): Promise<TimeTrackingSummary> {
    const [newSummary] = await db
      .insert(timeTrackingSummaries)
      .values(summary)
      .returning();
      
    return newSummary;
  }
  
  async updateTimeTrackingSummary(id: number, data: Partial<TimeTrackingSummary>): Promise<TimeTrackingSummary> {
    const [updatedSummary] = await db
      .update(timeTrackingSummaries)
      .set({
        ...data,
        updated_at: new Date()
      })
      .where(eq(timeTrackingSummaries.id, id))
      .returning();
      
    if (!updatedSummary) {
      throw new Error(`Time tracking summary with ID ${id} not found`);
    }
    
    return updatedSummary;
  }
  
  async getLatestSummary(linkedAccountId: number, summaryType: string): Promise<TimeTrackingSummary | undefined> {
    const [summary] = await db
      .select()
      .from(timeTrackingSummaries)
      .where(and(
        eq(timeTrackingSummaries.linked_account_id, linkedAccountId),
        eq(timeTrackingSummaries.summary_type, summaryType)
      ))
      .orderBy(desc(timeTrackingSummaries.summary_date))
      .limit(1);
      
    return summary || undefined;
  }
  
  // Time tracking methods - Settings
  async getTimeTrackingSettings(serverId: string): Promise<TimeTrackingSettings | undefined> {
    const [settings] = await db
      .select()
      .from(timeTrackingSettings)
      .where(eq(timeTrackingSettings.server_id, serverId));
      
    return settings || undefined;
  }
  
  async createTimeTrackingSettings(settings: InsertTimeTrackingSettings): Promise<TimeTrackingSettings> {
    const [newSettings] = await db
      .insert(timeTrackingSettings)
      .values(settings)
      .returning();
      
    return newSettings;
  }
  
  async updateTimeTrackingSettings(serverId: string, data: Partial<TimeTrackingSettings>): Promise<TimeTrackingSettings> {
    const [updatedSettings] = await db
      .update(timeTrackingSettings)
      .set({
        ...data,
        updated_at: new Date()
      })
      .where(eq(timeTrackingSettings.server_id, serverId))
      .returning();
      
    if (!updatedSettings) {
      throw new Error(`Time tracking settings for server ${serverId} not found`);
    }
    
    return updatedSettings;
  }
  
  // Conversation methods
  async getConversations(serverId: string, channelId?: string, limit = 50): Promise<Conversation[]> {
    if (channelId) {
      // If channelId is provided, use AND condition
      return await db.select().from(conversations)
        .where(and(
          eq(conversations.server_id, serverId),
          eq(conversations.channel_id, channelId)
        ))
        .orderBy(desc(conversations.created_at))
        .limit(limit);
    } else {
      // If no channelId, just filter by serverId
      return await db.select().from(conversations)
        .where(eq(conversations.server_id, serverId))
        .orderBy(desc(conversations.created_at))
        .limit(limit);
    }
  }
  
  async getConversationContext(serverId: string, channelId: string, userId: string, limit = 10): Promise<Conversation[]> {
    return await db.select()
      .from(conversations)
      .where(and(
        eq(conversations.server_id, serverId),
        eq(conversations.channel_id, channelId),
        eq(conversations.user_id, userId)
      ))
      .orderBy(asc(conversations.created_at))
      .limit(limit);
  }
  
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    // Ensure nullable fields are properly set before inserting
    const dataToInsert = {
      ...insertConversation,
      response: insertConversation.response ?? null,
      is_error: insertConversation.is_error ?? false,
      error_message: insertConversation.error_message ?? null
    };

    const [conversation] = await db.insert(conversations)
      .values(dataToInsert)
      .returning();
    
    return conversation;
  }
  
  // Rate limit methods
  async getRateLimit(userId: string, serverId: string): Promise<RateLimit | undefined> {
    const [rateLimit] = await db.select()
      .from(rateLimits)
      .where(and(
        eq(rateLimits.user_id, userId),
        eq(rateLimits.server_id, serverId)
      ));
    
    return rateLimit || undefined;
  }
  
  async incrementRateLimit(userId: string, serverId: string, countToAdd: number = 1): Promise<RateLimit> {
    let rateLimit = await this.getRateLimit(userId, serverId);
    
    if (!rateLimit) {
      // Initialize with one hour expiry
      const reset_at = new Date();
      reset_at.setHours(reset_at.getHours() + 1);
      
      const [newRateLimit] = await db.insert(rateLimits)
        .values({
          user_id: userId,
          server_id: serverId,
          count: countToAdd, // Use countToAdd instead of hardcoded 1
          reset_at
        })
        .returning();
      
      return newRateLimit;
    }
    
    // Check if reset time has passed
    if (new Date() > rateLimit.reset_at) {
      const reset_at = new Date();
      reset_at.setHours(reset_at.getHours() + 1);
      
      const [updatedRateLimit] = await db.update(rateLimits)
        .set({
          count: countToAdd, // Use countToAdd instead of hardcoded 1
          reset_at
        })
        .where(and(
          eq(rateLimits.user_id, userId),
          eq(rateLimits.server_id, serverId)
        ))
        .returning();
      
      return updatedRateLimit;
    }
    
    // Increment count by specified amount
    const [updatedRateLimit] = await db.update(rateLimits)
      .set({
        count: (rateLimit.count || 0) + countToAdd // Add countToAdd instead of hardcoded 1
      })
      .where(and(
        eq(rateLimits.user_id, userId),
        eq(rateLimits.server_id, serverId)
      ))
      .returning();
    
    return updatedRateLimit;
  }
  
  async resetRateLimit(userId: string, serverId: string): Promise<RateLimit> {
    const reset_at = new Date();
    reset_at.setHours(reset_at.getHours() + 1);
    
    const rateLimit = await this.getRateLimit(userId, serverId);
    
    if (!rateLimit) {
      const [newRateLimit] = await db.insert(rateLimits)
        .values({
          user_id: userId,
          server_id: serverId,
          count: 0,
          reset_at
        })
        .returning();
      
      return newRateLimit;
    }
    
    const [updatedRateLimit] = await db.update(rateLimits)
      .set({
        count: 0,
        reset_at
      })
      .where(and(
        eq(rateLimits.user_id, userId),
        eq(rateLimits.server_id, serverId)
      ))
      .returning();
    
    return updatedRateLimit;
  }
  
  // Bot settings methods
  async getBotSettings(serverId: string): Promise<BotSettings | undefined> {
    const [settings] = await db.select()
      .from(botSettings)
      .where(eq(botSettings.server_id, serverId));
    
    return settings || undefined;
  }
  
  async updateBotSettings(serverId: string, settingsObj: any): Promise<BotSettings> {
    const existingSettings = await this.getBotSettings(serverId);
    
    if (!existingSettings) {
      const [newSettings] = await db.insert(botSettings)
        .values({
          server_id: serverId,
          settings: settingsObj,
          updated_at: new Date()
        })
        .returning();
      
      return newSettings;
    }
    
    const [updatedSettings] = await db.update(botSettings)
      .set({
        settings: settingsObj,
        updated_at: new Date()
      })
      .where(eq(botSettings.server_id, serverId))
      .returning();
    
    return updatedSettings;
  }
  
  // Linked account methods
  async getLinkedAccount(discordUserId: string): Promise<LinkedAccount | undefined> {
    const [account] = await db.select().from(linkedAccounts)
      .where(eq(linkedAccounts.discord_user_id, discordUserId));
    
    return account || undefined;
  }
  
  async getLinkedAccountByVRChatId(vrchatUserId: string): Promise<LinkedAccount | undefined> {
    const [account] = await db.select().from(linkedAccounts)
      .where(eq(linkedAccounts.vrchat_user_id, vrchatUserId));
    
    return account || undefined;
  }
  
  async getLinkedAccountsByServer(serverId: string): Promise<LinkedAccount[]> {
    return await db.select().from(linkedAccounts)
      .where(eq(linkedAccounts.server_id, serverId));
  }
  
  async createLinkedAccount(account: InsertLinkedAccount): Promise<LinkedAccount> {
    // Check if account already exists
    const existing = await this.getLinkedAccount(account.discord_user_id);
    if (existing) {
      // Update if exists
      return await this.updateLinkedAccount(account.discord_user_id, account);
    }
    
    const [newAccount] = await db.insert(linkedAccounts).values({
      ...account,
      updated_at: new Date()
    }).returning();
    
    return newAccount;
  }
  
  async updateLinkedAccount(discordUserId: string, data: Partial<InsertLinkedAccount>): Promise<LinkedAccount> {
    const [account] = await db.update(linkedAccounts)
      .set({
        ...data,
        updated_at: new Date()
      })
      .where(eq(linkedAccounts.discord_user_id, discordUserId))
      .returning();
    
    return account;
  }
  
  async deleteLinkedAccount(discordUserId: string): Promise<boolean> {
    const result = await db.delete(linkedAccounts)
      .where(eq(linkedAccounts.discord_user_id, discordUserId))
      .returning();
    
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
