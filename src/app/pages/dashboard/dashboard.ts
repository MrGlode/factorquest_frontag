import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, Subscription, interval, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { GameStateService } from '../../services/game-state';
import { InventoryService } from '../../services/inventory';
import { MachineService } from '../../services/machine';
import { RecipeService } from '../../services/recipe';
import { ProductionService } from '../../services/production';

import { GameState, Inventory, Machine, Resource } from '../../models/game.model';

interface DashboardStats {
  totalMachines: number;
  activeMachines: number;
  totalProduction: number;
  totalResources: number;
  efficiency: number;
  revenue: number;
}

interface ProductionMetric {
  resourceName: string;
  resourceIcon: string;
  quantity: number;
  productionRate: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, OnDestroy {
  
  gameState$: Observable<GameState>;
  inventory$: Observable<Inventory>;
  machines$: Observable<Machine[]>;
  
  dashboardStats: DashboardStats = {
    totalMachines: 0,
    activeMachines: 0,
    totalProduction: 0,
    totalResources: 0,
    efficiency: 0,
    revenue: 0
  };
  
  productionMetrics: ProductionMetric[] = [];
  topResources: ProductionMetric[] = [];
  
  private subscriptions: Subscription[] = [];
  private refreshInterval = 5000; // 5 secondes

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
    this.initializeDashboard();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Initialiser le tableau de bord
  private initializeDashboard(): void {
    // Combiner toutes les données pour calculer les métriques
    const combinedData$ = combineLatest([
      this.gameState$,
      this.inventory$,
      this.machines$
    ]).pipe(
      map(([gameState, inventory, machines]) => {
        return { gameState, inventory, machines };
      })
    );

    const sub = combinedData$.subscribe(data => {
      this.calculateDashboardStats(data);
      this.calculateProductionMetrics(data);
    });
    
    this.subscriptions.push(sub);
  }

  // Rafraîchir automatiquement les données
  private startAutoRefresh(): void {
    const intervalSub = interval(this.refreshInterval).subscribe(() => {
      // Les observables se mettent à jour automatiquement
      // Cette fonction peut être utilisée pour des calculs supplémentaires
    });
    
    this.subscriptions.push(intervalSub);
  }

  // Calculer les statistiques principales
  private calculateDashboardStats(data: any): void {
    const { gameState, inventory, machines } = data;
    
    const activeMachines = machines.filter((m: Machine) => m.isActive);
    const totalResources = Object.values(inventory).reduce((sum: number, qty: any) => sum + qty, 0);
    
    let totalProductionRate = 0;
    activeMachines.forEach((machine: Machine) => {
      if (machine.selectedRecipeId) {
        const stats = this.productionService.getMachineStats(machine.id);
        if (stats) {
          totalProductionRate += stats.cyclesPerMinute;
        }
      }
    });

    this.dashboardStats = {
      totalMachines: machines.length,
      activeMachines: activeMachines.length,
      totalProduction: totalProductionRate,
      totalResources: totalResources,
      efficiency: machines.length > 0 ? (activeMachines.length / machines.length) * 100 : 0,
      revenue: gameState.money
    };
  }

  // Calculer les métriques de production par ressource
  private calculateProductionMetrics(data: any): void {
    const { inventory, machines } = data;
    const resources = this.recipeService.getResources();
    
    this.productionMetrics = [];
    
    resources.forEach(resource => {
      const quantity = inventory[resource.id] || 0;
      let productionRate = 0;
      
      // Calculer le taux de production pour cette ressource
      machines.forEach((machine: Machine) => {
        if (machine.isActive && machine.selectedRecipeId) {
          const recipe = this.recipeService.getRecipe(machine.selectedRecipeId);
          if (recipe) {
            // Vérifier si cette machine produit cette ressource
            const output = recipe.outputs.find(o => o.resourceId === resource.id);
            if (output) {
              const stats = this.productionService.getMachineStats(machine.id);
              if (stats) {
                productionRate += (output.quantity * stats.cyclesPerMinute);
              }
            }
          }
        }
      });
      
      if (quantity > 0 || productionRate > 0) {
        this.productionMetrics.push({
          resourceName: resource.name,
          resourceIcon: resource.icon,
          quantity: quantity,
          productionRate: productionRate
        });
      }
    });
    
    // Trier par quantité décroissante et prendre le top 5
    this.topResources = [...this.productionMetrics]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }

  // Obtenir les machines par type
  getMachinesByType(machines: Machine[], type: 'mine' | 'furnace' | 'assembler'): Machine[] {
    return machines.filter(m => m.type === type);
  }

  // Obtenir l'efficacité d'un type de machine
  getTypeEfficiency(machines: Machine[], type: 'mine' | 'furnace' | 'assembler'): number {
    const typeMachines = this.getMachinesByType(machines, type);
    const activeTypeMachines = typeMachines.filter(m => m.isActive);
    
    return typeMachines.length > 0 ? (activeTypeMachines.length / typeMachines.length) * 100 : 0;
  }

  // Obtenir la couleur d'efficacité
  getEfficiencyColor(efficiency: number): string {
    if (efficiency >= 80) return '#228B22';
    if (efficiency >= 50) return '#DAA520';
    if (efficiency >= 25) return '#FF8C00';
    return '#DC143C';
  }

  // Obtenir le statut d'efficacité
  getEfficiencyStatus(efficiency: number): string {
    if (efficiency >= 80) return 'Excellent';
    if (efficiency >= 50) return 'Bon';
    if (efficiency >= 25) return 'Moyen';
    return 'Faible';
  }

  // Calculer les revenus potentiels (simulation)
  calculatePotentialRevenue(): number {
    // Simulation simple : prix de base par ressource
    const resourcePrices: { [key: string]: number } = {
      'iron_wire': 15,
      'gear': 25,
      'iron_plate': 8,
      'copper_plate': 10
    };
    
    let totalValue = 0;
    this.productionMetrics.forEach(metric => {
      const resourceId = this.getResourceId(metric.resourceName);
      const price = resourcePrices[resourceId] || 5;
      totalValue += metric.quantity * price;
    });
    
    return totalValue;
  }

  // Obtenir l'ID de ressource à partir du nom
  private getResourceId(resourceName: string): string {
    const resource = this.recipeService.getResources().find(r => r.name === resourceName);
    return resource ? resource.id : '';
  }

  // Formater les nombres
  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  }
}