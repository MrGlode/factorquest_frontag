import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GameState } from '../models/game.model';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {

  private gameState: GameState = {
    money: 1000, // Argent de départ
    lastSaveTime: Date.now(),
    totalPlayTime: 0
  };

  private gameStateSubject = new BehaviorSubject<GameState>(this.gameState);

  constructor() {
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
  }

  // Dépenser de l'argent (retourne true si possible)
  spendMoney(amount: number): boolean {
    if (amount <= 0) return true;
    if (this.gameState.money < amount) return false;

    this.gameState.money -= amount;
    this.saveToStorage();
    this.gameStateSubject.next({ ...this.gameState });
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
    localStorage.setItem('factoquest_gamestate', JSON.stringify(this.gameState));
  }

  // Charger
  private loadFromStorage(): void {
    const saved = localStorage.getItem('factoquest_gamestate');
    if (saved) {
      try {
        const loadedState = JSON.parse(saved);
        this.gameState = { ...this.gameState, ...loadedState };
        this.gameStateSubject.next({ ...this.gameState });
      } catch (error) {
        console.error('Erreur lors du chargement de l\'état:', error);
      }
    }
  }

  // Reset pour debug
  reset(): void {
    this.gameState = {
      money: 1000,
      lastSaveTime: Date.now(),
      totalPlayTime: 0
    };
    this.saveToStorage();
    this.gameStateSubject.next({ ...this.gameState });
  }
}