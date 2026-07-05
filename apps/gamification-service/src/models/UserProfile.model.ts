// /apps/gamification-service/src/models/UserProfile.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProfile extends Document {
  userId: string;
  
  // XP & Level
  xp: number;
  level: number;
  xpToNextLevel: number;
  
  // Reputation
  reputation: number;        // Karma-Score
  
  // Badges & Achievements
  badges: string[];          // Badge-IDs
  achievements: string[];    // Achievement-IDs
  
  // Stats
  totalGrows: number;
  totalHarvests: number;
  totalYield: number;        // Gramm (gesamt)
  bestEfficiency: number;    // g/W (Rekord)
  totalPosts: number;        // Forum
  totalReplies: number;
  helpfulAnswers: number;    // Best Answers
  
  // Streaks
  currentStreak: number;     // Tage in Folge aktiv
  longestStreak: number;
  lastActiveDate: Date;
  
  // Leaderboard-Position
  globalRank?: number;       // Wird täglich berechnet
  
  createdAt: Date;
  updatedAt: Date;

  // Instance Methods (siehe unten im Schema definiert)
  calculateXPForLevel(level: number): number;
  calculateLevel(): void;
  addXP(amount: number): { levelUp: boolean; newLevel?: number };
  addBadge(badgeId: string): boolean;
  addAchievement(achievementId: string): boolean;
  updateStreak(): void;
}

const UserProfileSchema = new Schema<IUserProfile>({
  userId: { type: String, required: true, unique: true, index: true },
  
  xp: { type: Number, default: 0, index: true },
  level: { type: Number, default: 1, index: true },
  xpToNextLevel: { type: Number, default: 100 },
  
  reputation: { type: Number, default: 0, index: true },
  
  badges: [{ type: String }],
  achievements: [{ type: String }],
  
  totalGrows: { type: Number, default: 0 },
  totalHarvests: { type: Number, default: 0 },
  totalYield: { type: Number, default: 0 },
  bestEfficiency: { type: Number, default: 0 },
  totalPosts: { type: Number, default: 0 },
  totalReplies: { type: Number, default: 0 },
  helpfulAnswers: { type: Number, default: 0 },
  
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: { type: Date, default: Date.now },
  
  globalRank: Number
}, {
  timestamps: true
});

// Indexes
UserProfileSchema.index({ xp: -1 });
UserProfileSchema.index({ reputation: -1 });
UserProfileSchema.index({ level: -1, xp: -1 });

// Virtuals
UserProfileSchema.virtual('progressToNextLevel').get(function() {
  if (this.xpToNextLevel === 0) return 100;
  const currentLevelXP = this.calculateXPForLevel(this.level);
  const xpInCurrentLevel = this.xp - currentLevelXP;
  return Math.round((xpInCurrentLevel / this.xpToNextLevel) * 100);
});

// Methods
UserProfileSchema.methods.calculateXPForLevel = function(level: number): number {
  // Formel: XP = 100 * level^1.5
  // Level 1: 100 XP
  // Level 2: 283 XP
  // Level 10: 3162 XP
  // Level 50: 35355 XP
  // Level 100: 100000 XP
  return Math.round(100 * Math.pow(level, 1.5));
};

UserProfileSchema.methods.calculateLevel = function(): void {
  let newLevel = 1;
  
  while (this.xp >= this.calculateXPForLevel(newLevel + 1)) {
    newLevel++;
  }
  
  this.level = newLevel;
  this.xpToNextLevel = this.calculateXPForLevel(newLevel + 1) - this.xp;
};

UserProfileSchema.methods.addXP = function(amount: number): { levelUp: boolean; newLevel?: number } {
  const oldLevel = this.level;
  this.xp += amount;
  this.calculateLevel();
  
  return {
    levelUp: this.level > oldLevel,
    newLevel: this.level > oldLevel ? this.level : undefined
  };
};

UserProfileSchema.methods.addBadge = function(badgeId: string): boolean {
  if (this.badges.includes(badgeId)) return false;
  this.badges.push(badgeId);
  return true;
};

UserProfileSchema.methods.addAchievement = function(achievementId: string): boolean {
  if (this.achievements.includes(achievementId)) return false;
  this.achievements.push(achievementId);
  return true;
};

UserProfileSchema.methods.updateStreak = function(): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastActive = new Date(this.lastActiveDate);
  lastActive.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) {
    // Heute schon aktiv gewesen
    return;
  } else if (daysDiff === 1) {
    // Gestern aktiv → Streak fortsetzen
    this.currentStreak++;
    if (this.currentStreak > this.longestStreak) {
      this.longestStreak = this.currentStreak;
    }
  } else {
    // Streak unterbrochen
    this.currentStreak = 1;
  }
  
  this.lastActiveDate = new Date();
};

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
