import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';

import { GameStateApiService } from '../../services/game-state-api.service';
import { InventoryApiService } from '../../services/inventory-api.service';
import { MachineApiService } from '../../services/machine-api.service';
import { RecipeService } from '../../services/recipe';
import { ProductionService } from '../../services/production';

import { GameState, Inventory, Machine, Resource } from '../../models/game.model';

@Component({
  selector: 'app-mines',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mines.html',
  styleUrl: './mines.scss'
})
export class Mines implements OnInit, OnDestroy {
  
  gameState$: Observable<GameState>;
  inventory$: Observable<Inventory>;
  machines$: Observable<Machine[]>;
  
  // Ressources de type minerai uniquement
  mineralResources: Resource[] = [];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private gameStateService: GameStateApiService,
    private inventoryService: InventoryApiService,
    private machineService: MachineApiService,
    private recipeService: RecipeService,
    private productionService: ProductionService
  ) {
    this.gameState$ = this.gameStateService.getGameState$();
    this.inventory$ = this.inventoryService.getInventory$();
    this.machines$ = this.machineService.getMachines$();
  }

  ngOnInit(): void {
    // Filtrer les ressources pour ne garder que les minerais
    const allResources = this.recipeService.getResources();
    this.mineralResources = allResources.filter(resource => 
      resource.id.includes('ore') || resource.id === 'coal'
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Obtenir les mines seulement
  getMines(machines: Machine[]): Machine[] {
    return machines.filter(m => m.type === 'mine');
  }

  // Acheter une mine
  buyMine(): void {
    const cost = this.machineService.getMachineCost('mine');
    
    if (this.gameStateService.canAfford(cost)) {
      if (this.gameStateService.spendMoney(cost)) {
        this.machineService.buyMachine('mine').subscribe({
          next: (machine) => {
            console.log(`Mine achetée: ${machine.name} pour ${cost} crédits`);
          },
          error: (err) => {
            console.log('Erreur lors de l\'achat de la mine : ' + err.message);
          }
        });
      }
    } else {
      alert('Pas assez d\'argent pour acheter une mine !');
    }
  }

  // Changer la recette d'une mine
  setMineRecipe(machineId: string, recipeId: string): void {
    this.machineService.setMachineRecipe(machineId, recipeId).subscribe({
      next: (success) => {
        if (success) {
          console.log(`Recette de la mine ${machineId} changée avec succès`);
        }
      },
      error: (err) => {
        console.log('Erreur lors du changement de recette de la mine : ' + err.message);
      }
    });
  }

  // Activer/désactiver une mine
  toggleMine(machineId: string): void {
    // Récupérer le progrès actuel avant de mettre en pause
    const stats = this.productionService.getMachineStats(machineId);
    const currentProgress = stats ? (stats.progress * stats.recipe.duration) : 0;
    
    this.machineService.toggleMachine(machineId, currentProgress).subscribe({
      next: (success) => {
        if (success) {
          console.log(`Mine ${machineId} togglée avec succès`);
        }
      },
      error: (err) => {
        console.log('Erreur lors du toggle de la mine : ' + err.message);
      }
    });
  }

  // Obtenir les recettes de mines
  getMineRecipes() {
    return this.recipeService.getRecipesByMachineType('mine');
  }

  // Obtenir une ressource par ID
  getResource(resourceId: string): Resource | undefined {
    return this.recipeService.getResource(resourceId);
  }

  // Obtenir la quantité d'une ressource
  getResourceQuantity(resourceId: string): number {
    return this.inventoryService.getResourceQuantity(resourceId);
  }

  // Obtenir les statistiques d'une mine
  getMineStats(machineId: string) {
    return this.productionService.getMachineStats(machineId);
  }

  // Obtenir les infos d'achat de mine
  getMineInfo() {
    return this.machineService.getMachineTypeInfo('mine');
  }

  // Vérifier si on peut acheter une mine
  canAffordMine(): boolean {
    return this.gameStateService.canAfford(this.machineService.getMachineCost('mine'));
  }

  // Vérifier si l'inventaire de minerais est vide
  hasNoMinerals(): boolean {
    return this.mineralResources.every(resource => 
      this.getResourceQuantity(resource.id) === 0
    );
  }

  // Supprimer une mine
  deleteMine(machineId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette mine ?')) {
      this.machineService.deleteMachine(machineId).subscribe({
        next: (success) => {
          if (success) {
            console.log(`Mine ${machineId} supprimée avec succès`);
          }
        },
        error: (err) => {
          console.log('Erreur lors de la suppression de la mine : ' + err.message);
        }
      });
    }
  }
}