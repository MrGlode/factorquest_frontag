import { Injectable } from '@angular/core';
import { MachineService } from './machine';
import { RecipeService } from './recipe';
import { InventoryService } from './inventory';
import { GameStateService } from './game-state';

@Injectable({
  providedIn: 'root'
})
export class ProductionService {

  private productionInterval: any;

  constructor(
    private machineService: MachineService,
    private recipeService: RecipeService,
    private inventoryService: InventoryService,
    private gameStateService: GameStateService
  ) {
    this.startProductionLoop();
    this.calculateOfflineProduction();
  }

  // Démarrer la boucle de production (toutes les secondes)
  private startProductionLoop(): void {
    this.productionInterval = setInterval(() => {
      this.processAllMachines();
      this.gameStateService.updatePlayTime();
    }, 1000);
  }

  // Traiter toutes les machines actives
  private processAllMachines(): void {
    const activeMachines = this.machineService.getActiveMachines();
    
    activeMachines.forEach(machine => {
      if (machine.selectedRecipeId) {
        this.processMachine(machine.id);
      }
    });
  }

  // Traiter une machine spécifique
  private processMachine(machineId: string): void {
    const machine = this.machineService.getMachine(machineId);
    if (!machine || !machine.selectedRecipeId || !machine.isActive) return;

    const recipe = this.recipeService.getRecipe(machine.selectedRecipeId);
    if (!recipe) return;

    const now = Date.now();
    const timeSinceLastProduction = (now - machine.lastProductionTime) / 1000; // en secondes
    
    // Calculer combien de cycles complets on peut faire
    const completedCycles = Math.floor(timeSinceLastProduction / recipe.duration);
    
    if (completedCycles > 0) {
      // Vérifier si on a les ressources nécessaires
      const canProduce = this.canProduceRecipe(recipe, completedCycles);
      
      if (canProduce) {
        // Consommer les ressources d'entrée
        this.consumeInputs(recipe, completedCycles);
        
        // Produire les ressources de sortie
        this.produceOutputs(recipe, completedCycles);
        
        // Mettre à jour le temps de production
        const newLastProductionTime = machine.lastProductionTime + (completedCycles * recipe.duration * 1000);
        this.machineService.updateMachineProductionTime(machineId);
        
        console.log(`${machine.name} a produit ${completedCycles} cycle(s) de ${recipe.name}`);
      } else {
        console.log(`${machine.name} ne peut pas produire: ressources insuffisantes`);
        // La machine reste active mais ne produit pas
      }
    }
  }

  // Vérifier si on peut produire une recette
  private canProduceRecipe(recipe: any, cycles: number = 1): boolean {
    // Les mines n'ont pas besoin de ressources d'entrée
    if (recipe.machineType === 'mine') return true;
    
    return recipe.inputs.every((input: any) => 
      this.inventoryService.getResourceQuantity(input.resourceId) >= (input.quantity * cycles)
    );
  }

  // Consommer les ressources d'entrée
  private consumeInputs(recipe: any, cycles: number = 1): void {
    if (recipe.machineType === 'mine') return; // Les mines ne consomment rien
    
    recipe.inputs.forEach((input: any) => {
      this.inventoryService.removeResource(input.resourceId, input.quantity * cycles);
    });
  }

  // Produire les ressources de sortie
  private produceOutputs(recipe: any, cycles: number = 1): void {
    recipe.outputs.forEach((output: any) => {
      this.inventoryService.addResource(output.resourceId, output.quantity * cycles);
    });
  }

  // Calculer la production hors ligne
  private calculateOfflineProduction(): void {
    const offlineTimeMs = this.gameStateService.getOfflineTime();
    const offlineTimeSeconds = Math.floor(offlineTimeMs / 1000);
    
    if (offlineTimeSeconds > 0) {
      console.log(`Calcul de la production hors ligne: ${offlineTimeSeconds} secondes`);
      
      const activeMachines = this.machineService.getActiveMachines();
      
      activeMachines.forEach(machine => {
        if (machine.selectedRecipeId) {
          const recipe = this.recipeService.getRecipe(machine.selectedRecipeId);
          if (recipe) {
            const maxCycles = Math.floor(offlineTimeSeconds / recipe.duration);
            
            if (maxCycles > 0) {
              // Pour les mines, on produit directement
              if (recipe.machineType === 'mine') {
                this.produceOutputs(recipe, maxCycles);
              } else {
                // Pour les autres, on vérifie les ressources disponibles
                let actualCycles = 0;
                for (let i = 0; i < maxCycles; i++) {
                  if (this.canProduceRecipe(recipe, 1)) {
                    this.consumeInputs(recipe, 1);
                    this.produceOutputs(recipe, 1);
                    actualCycles++;
                  } else {
                    break; // Plus de ressources disponibles
                  }
                }
                console.log(`${machine.name} a produit ${actualCycles} cycles hors ligne`);
              }
            }
          }
        }
      });
    }
  }

  // Obtenir les statistiques de production d'une machine
  getMachineStats(machineId: string) {
    const machine = this.machineService.getMachine(machineId);
    if (!machine || !machine.selectedRecipeId) return null;

    const recipe = this.recipeService.getRecipe(machine.selectedRecipeId);
    if (!recipe) return null;

    let progress = 0;
    
    if (machine.isActive) {
      // Machine active : calcul normal du progrès
      const now = Date.now();
      const timeSinceLastProduction = (now - machine.lastProductionTime) / 1000;
      progress = Math.min((timeSinceLastProduction % recipe.duration) / recipe.duration, 1);
    } else {
      // Machine en pause : on garde le progrès sauvegardé
      progress = Math.min(machine.pausedProgress / recipe.duration, 1);
    }

    return {
      machine,
      recipe,
      progress,
      canProduce: this.canProduceRecipe(recipe),
      cyclesPerMinute: 60 / recipe.duration
    };
  }

  // Nettoyer les intervalles
  ngOnDestroy(): void {
    if (this.productionInterval) {
      clearInterval(this.productionInterval);
    }
  }
}