import { pgTable, text, serial, integer, boolean, timestamp, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// For Discord servers the bot is connected to
export const servers = pgTable("servers", {
  id: text("id").primaryKey(), // Discord server ID
  name: text("name").notNull(),
  joined_at: timestamp("joined_at").notNull().defaultNow(),
});

export const insertServerSchema = createInsertSchema(servers);
export type InsertServer = z.infer<typeof insertServerSchema>;
export type Server = typeof servers.$inferSelect;

// For storing conversation history
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  server_id: text("server_id").notNull().references(() => servers.id),
  channel_id: text("channel_id").notNull(),
  user_id: text("user_id").notNull(),
  username: text("username").notNull(),
  message: text("message").notNull(),
  response: text("response"),
  command: text("command").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  is_error: boolean("is_error").default(false),
  error_message: text("error_message"),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  created_at: true
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// For tracking rate limits
export const rateLimits = pgTable("rate_limits", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  server_id: text("server_id").notNull().references(() => servers.id),
  count: integer("count").notNull().default(0),
  reset_at: timestamp("reset_at").notNull(),
});

export const insertRateLimitSchema = createInsertSchema(rateLimits).omit({
  id: true
});

export type InsertRateLimit = z.infer<typeof insertRateLimitSchema>;
export type RateLimit = typeof rateLimits.$inferSelect;

// For storing bot settings
export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  server_id: text("server_id").notNull().references(() => servers.id).unique(),
  settings: json("settings").notNull(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBotSettingsSchema = createInsertSchema(botSettings).omit({
  id: true,
  updated_at: true
});

export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;
export type BotSettings = typeof botSettings.$inferSelect;

// API Status type
export const ApiStatusSchema = z.object({
  discord: z.boolean(),
  openai: z.boolean(),
  groq: z.boolean(),
  wCounterToken: z.boolean().optional(), // W Counter bot token availability
  uptime: z.number(),
  rate_limit: z.object({
    used: z.number(),
    total: z.number(),
    reset_in: z.number()
  }),
  servers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    alerts: z.number().optional()
  }))
});

export type ApiStatus = z.infer<typeof ApiStatusSchema>;

// For storing linked VRChat accounts
export const linkedAccounts = pgTable("linked_accounts", {
  id: serial("id").primaryKey(),
  discord_user_id: text("discord_user_id").notNull().unique(),
  discord_username: text("discord_username").notNull(),
  vrchat_user_id: text("vrchat_user_id").notNull().unique(),
  vrchat_username: text("vrchat_username").notNull(),
  vrchat_display_name: text("vrchat_display_name").notNull(),
  server_id: text("server_id").notNull().references(() => servers.id),
  role_id: text("role_id").notNull(),
  verification_code: varchar("verification_code", { length: 10 }),
  verified: boolean("verified").default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLinkedAccountSchema = createInsertSchema(linkedAccounts).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export type InsertLinkedAccount = z.infer<typeof insertLinkedAccountSchema>;
export type LinkedAccount = typeof linkedAccounts.$inferSelect;

// Strains schema for kUShCOOKIES Strain of the Day feature
export const strains = pgTable("strains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // indica, sativa, hybrid
  thc_content: text("thc_content"),
  cbd_content: text("cbd_content"),
  flavor_profile: text("flavor_profile"),
  effects: text("effects"),
  description: text("description").notNull(),
  image_url: text("image_url"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertStrainSchema = createInsertSchema(strains).omit({
  id: true,
  created_at: true,
});
export type InsertStrain = z.infer<typeof insertStrainSchema>;
export type Strain = typeof strains.$inferSelect;

// Strain Announcement Settings
export const strainAnnouncements = pgTable("strain_announcements", {
  id: serial("id").primaryKey(),
  server_id: text("server_id").notNull(),
  channel_id: text("channel_id").notNull(),
  time: text("time").notNull(), // In HH:MM format
  timezone: text("timezone").default("UTC"),
  is_enabled: boolean("is_enabled").default(true),
  last_announced: timestamp("last_announced"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertStrainAnnouncementSchema = createInsertSchema(strainAnnouncements).omit({
  id: true,
  last_announced: true,
  created_at: true,
});
export type InsertStrainAnnouncement = z.infer<typeof insertStrainAnnouncementSchema>;
export type StrainAnnouncement = typeof strainAnnouncements.$inferSelect;

// Time tracking schemas for VRChat user monitoring
export const timeTrackingSessions = pgTable("time_tracking_sessions", {
  id: serial("id").primaryKey(),
  linked_account_id: integer("linked_account_id").references(() => linkedAccounts.id).notNull(),
  server_id: text("server_id").notNull().references(() => servers.id),
  session_start: timestamp("session_start").notNull(),
  session_end: timestamp("session_end"),
  duration_minutes: integer("duration_minutes"),
  world_id: text("world_id"),
  world_name: text("world_name"),
  status: text("status"), // Online, Offline, Away, etc.
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertTimeTrackingSessionSchema = createInsertSchema(timeTrackingSessions).omit({
  id: true,
  duration_minutes: true,
  created_at: true,
});
export type InsertTimeTrackingSession = z.infer<typeof insertTimeTrackingSessionSchema>;
export type TimeTrackingSession = typeof timeTrackingSessions.$inferSelect;

// Time tracking summary table for daily/weekly statistics
export const timeTrackingSummaries = pgTable("time_tracking_summaries", {
  id: serial("id").primaryKey(),
  linked_account_id: integer("linked_account_id").references(() => linkedAccounts.id).notNull(),
  server_id: text("server_id").notNull().references(() => servers.id),
  summary_date: timestamp("summary_date").notNull(),
  summary_type: text("summary_type").notNull(), // "daily", "weekly", "monthly"
  total_minutes: integer("total_minutes").default(0),
  active_sessions: integer("active_sessions").default(0),
  worlds_visited: integer("worlds_visited").default(0),
  worlds_data: json("worlds_data"), // Structured data about which worlds were visited
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertTimeTrackingSummarySchema = createInsertSchema(timeTrackingSummaries).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertTimeTrackingSummary = z.infer<typeof insertTimeTrackingSummarySchema>;
export type TimeTrackingSummary = typeof timeTrackingSummaries.$inferSelect;

// Time tracking settings for each server
export const timeTrackingSettings = pgTable("time_tracking_settings", {
  id: serial("id").primaryKey(),
  server_id: text("server_id").notNull().references(() => servers.id).unique(),
  enabled: boolean("enabled").default(true),
  track_worlds: boolean("track_worlds").default(true),
  check_interval_minutes: integer("check_interval_minutes").default(5),
  milestone_roles: json("milestone_roles"), // Map minutes to role IDs
  notification_channel_id: text("notification_channel_id"),
  milestone_notifications: boolean("milestone_notifications").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertTimeTrackingSettingsSchema = createInsertSchema(timeTrackingSettings).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertTimeTrackingSettings = z.infer<typeof insertTimeTrackingSettingsSchema>;
export type TimeTrackingSettings = typeof timeTrackingSettings.$inferSelect;
