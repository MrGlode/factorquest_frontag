export interface GlobalGameStateResponse {
    state: GameStateResponse;
    inventory: InventoryResponse;
    machines: MachineResponse[];
}
export interface GameStateResponse {
    userId: string;
    money: number;
    lastSavedTime: number;
    totalPlayTime: number;
}

export interface UpdateGameStateRequest {
    money?: number;
    totalPlayTime?: number;
}

export interface OfflineProgressResponse {
    offlineTime: number; // in seconds
    moneyEarned: number;
    resourcesProduced: { resourceId: string; quantity: number }[];
    message: string;
}

export interface InventoryResponse {
    userId: string;
    items: { [resourceId: string]: number };
    lastUpdated: string;
}

export interface UpdateInventoryRequest {
    resourceId: string;
    quantity: number;
    operation: 'add' | 'remove' | 'set';
}

export interface ConsumeResourcesRequest {
    resources: { resourceId: string; quantity: number }[];
}

export interface MachineResponse {
    id: string;
    userId: string;
    type: 'mine' | 'furnace' | 'assembler';
    name: string;
    cost: number;
    selectedRecipeId?: string;
    lastProductionTime: number;
    pausedProgress: number;
    isActive: boolean;
    createdAt: string;
}

export interface PurchaseMachineRequest {
    type: 'mine' | 'furnace' | 'assembler';
}

export interface UpdateMachineRequest {
    selectedRecipeId?: string;
    isActive?: boolean;
    pausedProgress?: number;
}

export interface MachineProductionRequest {
    recipeId: string;
}

export interface MachineProductionResponse {
    success: boolean;
    message: string;
    producedResources: { resourceId: string; quantity: number }[];
    consumedResources: { resourceId: string; quantity: number }[];
}

export interface ResourceResponse {
    id: string;
    name: string;
    icon: string;
    basePrice: number;
    category: string;
}

export interface RecipeResponse {
    id: string;
    name: string;
    inputs: { resourceId: string; quantity: number }[];
    outputs: { resourceId: string; quantity: number }[];
    duration: number;
    machineType: 'mine' | 'furnace' | 'assembler';
    isUnlocked: boolean;
}

export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
}

export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
    }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;