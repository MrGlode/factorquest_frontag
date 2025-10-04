import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Inventory } from '../models/game.model';
import { SaveService } from './save.service';
import { PlayerStatsService } from './player-stats.service';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  
  private inventory: Inventory = {};
  private inventorySubject = new BehaviorSubject<Inventory>(this.inventory);

  constructor(
    private saveService: SaveService,
    private playerStatsService: PlayerStatsService
  ) {
    this.loadFromStorage();
  }

  // Observable pour que les composants puissent s'abonner aux changements
  getInventory$(): Observable<Inventory> {
    return this.inventorySubject.asObservable();
  }

  // Obtenir l'inventaire actuel
  getInventory(): Inventory {
    return { ...this.inventory };
  }

  // Obtenir la quantité d'une ressource
  getResourceQuantity(resourceId: string): number {
    return this.inventory[resourceId] || 0;
  }

  // Ajouter des ressources
  addResource(resourceId: string, quantity: number): void {
    if (quantity <= 0) return;
    
    this.inventory[resourceId] = (this.inventory[resourceId] || 0) + quantity;
    this.saveToStorage();
    this.inventorySubject.next({ ...this.inventory });
    this.playerStatsService.trackResourceProduced(quantity);
  }

  // Retirer des ressources (retourne true si possible, false sinon)
  removeResource(resourceId: string, quantity: number): boolean {
    if (quantity <= 0) return true;
    
    const currentQuantity = this.inventory[resourceId] || 0;
    if (currentQuantity < quantity) {
      return false; // Pas assez de ressources
    }

    this.inventory[resourceId] = currentQuantity - quantity;
    if (this.inventory[resourceId] === 0) {
      delete this.inventory[resourceId];
    }
    
    this.saveToStorage();
    this.inventorySubject.next({ ...this.inventory });
    return true;
  }

  // Vérifier si on peut retirer des ressources
  canRemoveResources(resources: { resourceId: string; quantity: number }[]): boolean {
    return resources.every(({ resourceId, quantity }) => 
      this.getResourceQuantity(resourceId) >= quantity
    );
  }

  // Retirer plusieurs ressources en une fois
  removeResources(resources: { resourceId: string; quantity: number }[]): boolean {
    if (!this.canRemoveResources(resources)) {
      return false;
    }

    resources.forEach(({ resourceId, quantity }) => {
      this.removeResource(resourceId, quantity);
    });
    
    return true;
  }

  // Ajouter plusieurs ressources en une fois
  addResources(resources: { resourceId: string; quantity: number }[]): void {
    resources.forEach(({ resourceId, quantity }) => {
      this.addResource(resourceId, quantity);
    });
  }

  // Sauvegarder
  private saveToStorage(): void {
    this.saveService.save('inventory', this.inventory);
  }

  // Charger
  private loadFromStorage(): void {
    const saved = this.saveService.load<any>('inventory');
    if (saved) {
      this.inventory = saved;
      this.inventorySubject.next({ ...this.inventory });
    }
  }

  // Réinitialiser l'inventaire (pour debug/tests)
  reset(): void {
    this.inventory = {};
    this.saveToStorage();
    this.inventorySubject.next({ ...this.inventory });
  }
}