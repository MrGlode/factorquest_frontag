export interface Resource {
    id: string;
    name: string;
    icon: string;
}

export interface Recipe {
    id: string;
    name: string;
    inputs: { resourceId: string; quantity: number }[];
    outputs: { resourceId: string; quantity: number }[];
    duration: number;
    machineType: 'mine' | 'furnace' | 'assembler';
}

export interface Machine {
    id: string;
    type: 'mine' | 'furnace' | 'assembler';
    name: string;
    cost: number;
    selectedRecipeId?: string;
    lastProductionTime: number;
    pausedProgress: number;
    isActive: boolean;
}

export interface Inventory {
    [resourceId: string]: number;
}

export interface GameState {
    money: number;
    lastSaveTime: number;
    totalPlayTime: number;
}

export interface ProductionState {
    machineId: string;
    recipeId: string;
    progress: number;
    startTime: number;
}