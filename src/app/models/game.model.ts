// Types des ressources
export interface Resource {
  id: string;
  name: string;
  icon: string;
}

// Types des recettes
export interface Recipe {
  id: string;
  name: string;
  inputs: { resourceId: string; quantity: number }[];
  outputs: { resourceId: string; quantity: number }[];
  duration: number; // en secondes
  machineType: 'mine' | 'furnace' | 'assembler';
}

// Machine possédée par le joueur
export interface Machine {
  id: string;
  type: 'mine' | 'furnace' | 'assembler';
  name: string;
  cost: number;
  selectedRecipeId?: string;
  lastProductionTime: number; // timestamp
  pausedProgress: number; // temps écoulé dans le cycle actuel au moment de la pause (en secondes)
  isActive: boolean;
}

// État de l'inventaire
export interface Inventory {
  [resourceId: string]: number;
}

// État général du jeu
export interface GameState {
  money: number;
  lastSaveTime: number;
  totalPlayTime: number;
}

// État de production d'une machine
export interface ProductionState {
  machineId: string;
  recipeId: string;
  progress: number; // 0-1
  startTime: number;
}

// Système de marché
export interface MarketPrice {
  resourceId: string;
  basePrice: number;
  currentPrice: number;
  demand: number; // 0-1 (faible à forte demande)
  lastSold: number; // timestamp
}

// Commandes spéciales
export interface SpecialOrder {
  id: string;
  clientName: string;
  clientType: 'noble' | 'factory' | 'government' | 'merchant';
  requirements: { resourceId: string; quantity: number }[];
  reward: number;
  bonus: number; // bonus si livré rapidement
  deadline: number; // timestamp
  description: string;
  isCompleted: boolean;
  isExpired: boolean;
}

// Transaction de vente
export interface Transaction {
  id: string;
  resourceId: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  timestamp: number;
  type: 'market' | 'order';
  orderId?: string;
}

// Système de recherche
export interface Laboratory {
  id: string;
  name: string;
  type: 'basic' | 'advanced' | 'institute' | 'mining' | 'metallurgy' | 'mechanical';
  cost: number;
  researchSpeed: number; // Multiplicateur de vitesse
  maxSimultaneousResearch: number;
  specialization?: 'mine' | 'furnace' | 'assembler' | 'general';
  purchaseTime: number;
}

export interface Research {
  id: string;
  name: string;
  description: string;
  category: 'mine' | 'furnace' | 'assembler' | 'general';
  requirements: { resourceId: string; quantity: number }[];
  duration: number; // en secondes
  prerequisites: string[]; // IDs des recherches requises
  effects: ResearchEffect[];
  icon: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  isInProgress: boolean;
  startTime?: number;
  laboratoryId?: string;
}

export interface ResearchEffect {
  type: 'speed' | 'efficiency' | 'unlock_recipe' | 'cost_reduction' | 'bonus_output';
  target: 'mine' | 'furnace' | 'assembler' | 'all';
  value: number; // Pourcentage ou valeur absolue
  description: string;
}

export interface ResearchProgress {
  researchId: string;
  laboratoryId: string;
  startTime: number;
  estimatedEndTime: number;
  progress: number; // 0-1
}