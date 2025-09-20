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
  selector: 'app-assemblers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assemblers.html',
  styleUrl: './assemblers.scss'
})
export class Assemblers implements OnInit, OnDestroy {
  
  gameState$: Observable<GameState>;
  inventory$: Observable<Inventory>;
  machines$: Observable<Machine[]>;
  
  // Ressources de type items finis (fils, engrenages, etc.)
  finishedItems: Resource[] = [];
  
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
    // Filtrer les ressources pour ne garder que les items finis
    const allResources = this.recipeService.getResources();
    this.finishedItems = allResources.filter(resource => 
      resource.id.includes('wire') || 
      resource.id.includes('gear') || 
      (!resource.id.includes('ore') && !resource.id.includes('plate') && resource.id !== 'coal')
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Obtenir les assembleurs seulement
  getAssemblers(machines: Machine[]): Machine[] {
    return machines.filter(m => m.type === 'assembler');
  }

  // Acheter un assembleur
  buyAssembler(): void {
    const cost = this.machineService.getMachineCost('assembler');
    
    if (this.gameStateService.canAfford(cost)) {
      if (this.gameStateService.spendMoney(cost)) {
        const machine = this.machineService.buyMachine('assembler');
        console.log(`Assembleur acheté: ${machine.name} pour ${cost} crédits`);
      }
    } else {
      alert('Pas assez d\'argent pour acheter un assembleur !');
    }
  }

  // Changer la recette d'un assembleur
  setAssemblerRecipe(machineId: string, recipeId: string): void {
    this.machineService.setMachineRecipe(machineId, recipeId);
  }

  // Activer/désactiver un assembleur
  toggleAssembler(machineId: string): void {
    // Récupérer le progrès actuel avant de mettre en pause
    const stats = this.productionService.getMachineStats(machineId);
    const currentProgress = stats ? (stats.progress * stats.recipe.duration) : 0;
    
    this.machineService.toggleMachine(machineId, currentProgress);
  }

  // Obtenir les recettes d'assembleurs
  getAssemblerRecipes() {
    return this.recipeService.getRecipesByMachineType('assembler');
  }

  // Obtenir une ressource par ID
  getResource(resourceId: string): Resource | undefined {
    return this.recipeService.getResource(resourceId);
  }

  // Obtenir la quantité d'une ressource
  getResourceQuantity(resourceId: string): number {
    return this.inventoryService.getResourceQuantity(resourceId);
  }

  // Obtenir les statistiques d'un assembleur
  getAssemblerStats(machineId: string) {
    return this.productionService.getMachineStats(machineId);
  }

  // Obtenir les infos d'achat d'assembleur
  getAssemblerInfo() {
    return this.machineService.getMachineTypeInfo('assembler');
  }

  // Vérifier si on peut acheter un assembleur
  canAffordAssembler(): boolean {
    return this.gameStateService.canAfford(this.machineService.getMachineCost('assembler'));
  }

  // Vérifier si l'inventaire d'items finis est vide
  hasNoFinishedItems(): boolean {
    return this.finishedItems.every(resource => 
      this.getResourceQuantity(resource.id) === 0
    );
  }

  // Supprimer un assembleur
  deleteAssembler(machineId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet assembleur ?')) {
      this.machineService.deleteMachine(machineId);
    }
  }

  // Vérifier si une recette peut être produite
  canProduceRecipe(machineId: string): boolean {
    const stats = this.getAssemblerStats(machineId);
    return stats ? stats.canProduce : false;
  }

  // Obtenir le niveau de complexité d'une recette (nombre d'inputs)
  getRecipeComplexity(recipeId: string): number {
    const recipe = this.recipeService.getRecipe(recipeId);
    return recipe ? recipe.inputs.length : 0;
  }
}