import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';

import { GameStateService } from '../../services/game-state';
import { InventoryService } from '../../services/inventory';
import { MachineService } from '../../services/machine';
import { RecipeService } from '../../services/recipe';
import { ProductionService } from '../../services/production';

import { GameState, Inventory, Machine, Resource } from '../../models/game.model';

@Component({
  selector: 'app-furnaces',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './furnaces.html',
  styleUrl: './furnaces.scss'
})
export class Furnaces implements OnInit, OnDestroy {
  
  gameState$: Observable<GameState>;
  inventory$: Observable<Inventory>;
  machines$: Observable<Machine[]>;
  
  // Ressources de type lingots/plaques
  processedResources: Resource[] = [];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private gameStateService: GameStateService,
    private inventoryService: InventoryService,
    private machineService: MachineService,
    private recipeService: RecipeService,
    private productionService: ProductionService
  ) {
    this.gameState$ = this.gameStateService.getGameState$();
    this.inventory$ = this.inventoryService.getInventory$();
    this.machines$ = this.machineService.getMachines$();
  }

  ngOnInit(): void {
    // Filtrer les ressources pour ne garder que les lingots/plaques
    const allResources = this.recipeService.getResources();
    this.processedResources = allResources.filter(resource => 
      resource.id.includes('plate') || resource.id.includes('ingot')
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Obtenir les fours seulement
  getFurnaces(machines: Machine[]): Machine[] {
    return machines.filter(m => m.type === 'furnace');
  }

  // Acheter un four
  buyFurnace(): void {
    const cost = this.machineService.getMachineCost('furnace');
    
    if (this.gameStateService.canAfford(cost)) {
      if (this.gameStateService.spendMoney(cost)) {
        const machine = this.machineService.buyMachine('furnace');
        console.log(`Four acheté: ${machine.name} pour ${cost} crédits`);
      }
    } else {
      alert('Pas assez d\'argent pour acheter un four !');
    }
  }

  // Changer la recette d'un four
  setFurnaceRecipe(machineId: string, recipeId: string): void {
    this.machineService.setMachineRecipe(machineId, recipeId);
  }

  // Activer/désactiver un four
  toggleFurnace(machineId: string): void {
    // Récupérer le progrès actuel avant de mettre en pause
    const stats = this.productionService.getMachineStats(machineId);
    const currentProgress = stats ? (stats.progress * stats.recipe.duration) : 0;
    
    this.machineService.toggleMachine(machineId, currentProgress);
  }

  // Obtenir les recettes de fours
  getFurnaceRecipes() {
    return this.recipeService.getRecipesByMachineType('furnace');
  }

  // Obtenir une ressource par ID
  getResource(resourceId: string): Resource | undefined {
    return this.recipeService.getResource(resourceId);
  }

  // Obtenir la quantité d'une ressource
  getResourceQuantity(resourceId: string): number {
    return this.inventoryService.getResourceQuantity(resourceId);
  }

  // Obtenir les statistiques d'un four
  getFurnaceStats(machineId: string) {
    return this.productionService.getMachineStats(machineId);
  }

  // Obtenir les infos d'achat de four
  getFurnaceInfo() {
    return this.machineService.getMachineTypeInfo('furnace');
  }

  // Vérifier si on peut acheter un four
  canAffordFurnace(): boolean {
    return this.gameStateService.canAfford(this.machineService.getMachineCost('furnace'));
  }

  // Vérifier si l'inventaire de lingots est vide
  hasNoProcessedMaterials(): boolean {
    return this.processedResources.every(resource => 
      this.getResourceQuantity(resource.id) === 0
    );
  }

  // Supprimer un four
  deleteFurnace(machineId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce four ?')) {
      this.machineService.deleteMachine(machineId);
    }
  }

  // Vérifier si une recette peut être produite
  canProduceRecipe(machineId: string): boolean {
    const stats = this.getFurnaceStats(machineId);
    return stats ? stats.canProduce : false;
  }
}