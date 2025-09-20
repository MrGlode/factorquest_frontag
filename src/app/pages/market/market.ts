import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import { MarketService } from '../../services/market';
import { GameStateService } from '../../services/game-state';
import { InventoryService } from '../../services/inventory';
import { RecipeService } from '../../services/recipe';

import { MarketPrice, SpecialOrder, Transaction, Inventory, Resource } from '../../models/game.model';

@Component({
  selector: 'app-market',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './market.html',
  styleUrl: './market.scss'
})
export class Market implements OnInit, OnDestroy {
  
  marketPrices$: Observable<MarketPrice[]>;
  specialOrders$: Observable<SpecialOrder[]>;
  transactions$: Observable<Transaction[]>;
  inventory$: Observable<Inventory>;
  
  // Quantités à vendre (formulaire)
  sellQuantities: { [resourceId: string]: number } = {};

  Date = Date; // Pour le template
  
  private subscriptions: Subscription[] = [];
price: any;

  constructor(
    private marketService: MarketService,
    private gameStateService: GameStateService,
    private inventoryService: InventoryService,
    private recipeService: RecipeService
  ) {
    this.marketPrices$ = this.marketService.getMarketPrices$();
    this.specialOrders$ = this.marketService.getSpecialOrders$();
    this.transactions$ = this.marketService.getTransactions$();
    this.inventory$ = this.inventoryService.getInventory$();
  }

  ngOnInit(): void {
    // Initialiser les quantités de vente à 0
    const allResources = this.recipeService.getResources();
    allResources.forEach(resource => {
      this.sellQuantities[resource.id] = 0;
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Obtenir une ressource par ID
  getResource(resourceId: string): Resource | undefined {
    return this.recipeService.getResource(resourceId);
  }

  // Obtenir la quantité disponible d'une ressource
  getAvailableQuantity(resourceId: string): number {
    return this.inventoryService.getResourceQuantity(resourceId);
  }

  // Vendre une ressource sur le marché
  sellOnMarket(resourceId: string): void {
    const quantity = this.sellQuantities[resourceId];
    const available = this.getAvailableQuantity(resourceId);
    
    if (quantity <= 0) {
      alert('Quantité invalide !');
      return;
    }
    
    if (quantity > available) {
      alert(`Pas assez de ressources ! Vous avez ${available} unités.`);
      return;
    }
    
    // Retirer de l'inventaire
    if (this.inventoryService.removeResource(resourceId, quantity)) {
      // Vendre sur le marché
      const earnings = this.marketService.sellResource(resourceId, quantity);
      
      // Ajouter l'argent
      this.gameStateService.addMoney(earnings);
      
      // Reset la quantité
      this.sellQuantities[resourceId] = 0;
      
      alert(`Vendu ${quantity} unités pour ${earnings} crédits !`);
    }
  }

  // Vendre tout le stock d'une ressource
  sellAllOnMarket(resourceId: string): void {
    const available = this.getAvailableQuantity(resourceId);
    if (available > 0) {
      this.sellQuantities[resourceId] = available;
      this.sellOnMarket(resourceId);
    }
  }

  // Calculer la valeur estimée d'une vente
  calculateSaleValue(resourceId: string): number {
    const quantity = this.sellQuantities[resourceId] || 0;
    const currentPrice = this.marketService.getCurrentPrice(resourceId);
    return quantity * currentPrice;
  }

  // Livrer une commande spéciale
  fulfillSpecialOrder(order: SpecialOrder): void {
    const inventory = this.inventoryService.getInventory();
    const result = this.marketService.fulfillOrder(order.id, inventory);
    
    if (result.success) {
      // Retirer les ressources de l'inventaire
      order.requirements.forEach(req => {
        this.inventoryService.removeResource(req.resourceId, req.quantity);
      });
      
      // Ajouter l'argent
      this.gameStateService.addMoney(result.reward);
      
      alert(`${result.message}\nVous avez gagné ${result.reward} crédits !`);
    } else {
      alert(result.message);
    }
  }

  // Vérifier si on peut livrer une commande
  canFulfillOrder(order: SpecialOrder): boolean {
    return order.requirements.every(req => 
      this.getAvailableQuantity(req.resourceId) >= req.quantity
    );
  }

  // Obtenir le temps restant pour une commande
  getTimeRemaining(deadline: number): string {
    const now = Date.now();
    const remaining = deadline - now;
    
    if (remaining <= 0) return 'Expiré';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Obtenir la couleur selon l'urgence
  getUrgencyColor(deadline: number): string {
    const now = Date.now();
    const remaining = deadline - now;
    const totalTime = 2 * 60 * 60 * 1000; // 2 heures en ms
    const ratio = remaining / totalTime;
    
    if (ratio > 0.5) return '#228B22'; // Vert
    if (ratio > 0.25) return '#DAA520'; // Jaune
    return '#DC143C'; // Rouge
  }

  // Obtenir le statut de la demande du marché
  getDemandStatus(demand: number): string {
    if (demand > 0.8) return 'Très forte';
    if (demand > 0.6) return 'Forte';
    if (demand > 0.4) return 'Moyenne';
    if (demand > 0.2) return 'Faible';
    return 'Très faible';
  }

  // Obtenir la couleur de la demande
  getDemandColor(demand: number): string {
    if (demand > 0.8) return '#228B22';
    if (demand > 0.6) return '#90EE90';
    if (demand > 0.4) return '#DAA520';
    if (demand > 0.2) return '#FF8C00';
    return '#DC143C';
  }

  // Filtrer les commandes actives
  getActiveOrders(orders: SpecialOrder[]): SpecialOrder[] {
    return orders.filter(order => !order.isCompleted && !order.isExpired);
  }

  // Obtenir les dernières transactions
  getRecentTransactions(transactions: Transaction[]): Transaction[] {
    return transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  }

  // Formater un timestamp
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Obtenir l'icône du client
  getClientIcon(clientType: string): string {
    const icons = {
      noble: '👑',
      factory: '🏭',
      government: '🏛️',
      merchant: '💼'
    };
    return icons[clientType as keyof typeof icons] || '👤';
  }
  // Vérifier si on n'a aucune ressource à vendre
  hasNoResourcesToSell(marketPrices: MarketPrice[]): boolean {
    return marketPrices.every(p => this.getAvailableQuantity(p.resourceId) === 0);
  }
}