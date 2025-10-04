// src/app/models/player.model.ts

export interface PlayerStats {
  userId: string;
  totalMoneyEarned: number;
  totalMoneySpent: number;
  totalPlayTime: number;
  machinesBought: number;
  resourcesProduced: number;
  resourcesSold: number;
  researchesCompleted: number;
  specialOrdersCompleted: number;
  highestMoney: number;
  firstLoginDate: Date;
  lastLoginDate: Date;
  totalLogins: number;
}

export interface PlayerProfile {
  userId: string;
  username: string;
  email: string;
  stats: PlayerStats;
  achievements: string[]; // IDs des achievements débloqués
  level: number;
  experience: number;
  createdAt: Date;
  lastSaveAt: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'production' | 'economy' | 'research' | 'collection' | 'special';
  requirement: AchievementRequirement;
  reward?: {
    type: 'money' | 'experience';
    amount: number;
  };
  isSecret: boolean; // Ne s'affiche que quand débloqué
}

export interface AchievementRequirement {
  type: 'money_earned' | 'machines_bought' | 'resources_produced' | 'researches_completed' | 'special_orders' | 'play_time' | 'specific_action';
  target: number;
  resourceId?: string; // Pour les achievements liés à une ressource spécifique
}

export interface AchievementProgress {
  achievementId: string;
  current: number;
  target: number;
  percentage: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  stats: PlayerStats;
  achievementsCount: number;
  level: number;
}

export interface GameSave {
  userId: string;
  timestamp: number;
  gameState: any;
  inventory: any;
  machines: any;
  research: any;
  market: any;
}