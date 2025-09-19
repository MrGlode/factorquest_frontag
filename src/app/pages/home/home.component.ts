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
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  
  gameState$: Observable<GameState>;
  inventory$: Observable<Inventory>;
  machines$: Observable<Machine[]>;
  
  resources: Resource[] = [];
  
  // États pour l'interface
  selectedMachineType: 'mine' | 'furnace' | 'assembler' = 'mine';
  showShop = false;
  
  // Types de machines pour l'itération dans le template
  machineTypes: ('mine' | 'furnace' | 'assembler')[] = ['mine', 'furnace', 'assembler'];
  
  // Référence à Object pour le template
  Object = Object;
  
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
    this.resources = this.recipeService.getResources();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Acheter une machine
  buyMachine(type: 'mine' | 'furnace' | 'assembler'): void {
    const cost = this.machineService.getMachineCost(type);
    
    if (this.gameStateService.canAfford(cost)) {
      if (this.gameStateService.spendMoney(cost)) {
        const machine = this.machineService.buyMachine(type);
        console.log(`Machine achetée: ${machine.name} pour ${cost} crédits`);
      }
    } else {
      alert('Pas assez d\'argent !');
    }
  }

  // Changer la recette d'une machine
  setMachineRecipe(machineId: string, recipeId: string): void {
    this.machineService.setMachineRecipe(machineId, recipeId);
  }

  // Activer/désactiver une machine
  toggleMachine(machineId: string): void {
    // Récupérer le progrès actuel avant de mettre en pause
    const stats = this.productionService.getMachineStats(machineId);
    const currentProgress = stats ? (stats.progress * stats.recipe.duration) : 0;
    
    this.machineService.toggleMachine(machineId, currentProgress);
  }

  // Obtenir les recettes pour un type de machine
  getRecipesForMachineType(type: 'mine' | 'furnace' | 'assembler') {
    return this.recipeService.getRecipesByMachineType(type);
  }

  // Obtenir une ressource par ID
  getResource(resourceId: string): Resource | undefined {
    return this.recipeService.getResource(resourceId);
  }

  // Obtenir la quantité d'une ressource
  getResourceQuantity(resourceId: string): number {
    return this.inventoryService.getResourceQuantity(resourceId);
  }

  // Obtenir les statistiques d'une machine
  getMachineStats(machineId: string) {
    return this.productionService.getMachineStats(machineId);
  }

  // Filtrer les machines par type
  getMachinesByType(machines: Machine[], type: 'mine' | 'furnace' | 'assembler'): Machine[] {
    return machines.filter(m => m.type === type);
  }

  // Basculer l'affichage de la boutique
  toggleShop(): void {
    this.showShop = !this.showShop;
  }

  // Obtenir les infos d'un type de machine
  getMachineTypeInfo(type: 'mine' | 'furnace' | 'assembler') {
    return this.machineService.getMachineTypeInfo(type);
  }

  // Debug: reset du jeu
  resetGame(): void {
    if (confirm('Êtes-vous sûr de vouloir recommencer ?')) {
      this.gameStateService.reset();
      this.inventoryService.reset();
      this.machineService.reset();
      console.log('Jeu réinitialisé !');
    }
  }
}