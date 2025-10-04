import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GameState } from '../models/game.model';
import { MachineService } from '../services/machine';
import { InventoryService } from '../services/inventory';
import { MarketService } from '../services/market';
import { ResearchService } from '../services/research';
import { PlayerStatsService } from './player-stats.service';
import { SaveService } from './save.service';
import { AchievementsService } from './achievements.service';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {

  private gameState: GameState = {
    money: 10000, // Argent de départ
    lastSaveTime: Date.now(),
    totalPlayTime: 0
  };

  private gameStateSubject = new BehaviorSubject<GameState>(this.gameState);

  constructor(
    private machineService: MachineService,
    private inventoryService: InventoryService,
    private marketService: MarketService,
    private researchService: ResearchService,
    private playerStatsService: PlayerStatsService,
    private saveService: SaveService,
    private achievementsService: AchievementsService
  ) {
    this.loadFromStorage();
    this.calculateOfflineProgress();
  }

  // Observable pour les changements d'état
  getGameState$(): Observable<GameState> {
    return this.gameStateSubject.asObservable();
  }

  // Obtenir l'état actuel
  getGameState(): GameState {
    return { ...this.gameState };
  }

  // Obtenir l'argent actuel
  getMoney(): number {
    return this.gameState.money;
  }

  // Ajouter de l'argent
  addMoney(amount: number): void {
    if (amount <= 0) return;
    
    this.gameState.money += amount;
    this.saveToStorage();
    this.gameStateSubject.next({ ...this.gameState });

    this.playerStatsService.trackMoneyEarned(amount);
    this.playerStatsService.trackHighestMoney(this.gameState.money);
  }

  // Dépenser de l'argent (retourne true si possible)
  spendMoney(amount: number): boolean {
    if (amount <= 0) return true;
    if (this.gameState.money < amount) return false;

    this.gameState.money -= amount;
    this.saveToStorage();
    this.gameStateSubject.next({ ...this.gameState });
    this.playerStatsService.trackMoneySpent(amount);
    return true;
  }

  // Vérifier si on peut dépenser
  canAfford(amount: number): boolean {
    return this.gameState.money >= amount;
  }

  // Mettre à jour le temps de jeu
  updatePlayTime(): void {
    const now = Date.now();
    const timeDiff = now - this.gameState.lastSaveTime;
    this.gameState.totalPlayTime += timeDiff;
    this.gameState.lastSaveTime = now;
    this.saveToStorage();
  }

  // Calculer les gains hors ligne (si on revient plus tard)
  private calculateOfflineProgress(): void {
    const now = Date.now();
    const offlineTime = now - this.gameState.lastSaveTime;
    
    if (offlineTime > 0) {
      console.log(`Temps hors ligne: ${Math.floor(offlineTime / 1000)} secondes`);
      // Ici on pourrait calculer la production pendant l'absence
      // On le fera dans le ProductionService
      this.gameState.lastSaveTime = now;
      this.saveToStorage();
    }
  }

  // Obtenir le temps hors ligne en secondes
  getOfflineTime(): number {
    return Math.max(0, Date.now() - this.gameState.lastSaveTime);
  }

  // Sauvegarder
  private saveToStorage(): void {
    this.saveService.save('gamestate', this.gameState);
  }

  // Charger
  private loadFromStorage(): void {
    const saved = this.saveService.load('gamestate');
    if (saved) {
      this.gameState = { ...this.gameState, ...saved };
      this.gameStateSubject.next({ ...this.gameState });
    }
  }

  // Reset pour debug
  reset(): void {
    this.gameState = {
      money: 10000,
      lastSaveTime: Date.now(),
      totalPlayTime: 0
    };
    this.machineService.reset();
    this.inventoryService.reset();
    this.marketService.reset();
    this.researchService.reset();
    this.playerStatsService.reset();
    this.achievementsService.reset();
    this.saveToStorage();
    this.gameStateSubject.next({ ...this.gameState });
  }
}