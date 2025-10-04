// src/app/services/save.service.ts

import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { GameSave } from '../models/player.model';

@Injectable({
  providedIn: 'root'
})
export class SaveService {

  constructor(private authService: AuthService) {}

  // Obtenir la clé de sauvegarde pour l'utilisateur actuel
  private getSaveKey(key: string): string {
    const user = this.authService.currentUserValue;
    if (!user) {
      throw new Error('Aucun utilisateur connecté');
    }
    return `factoquest_${user.id}_${key}`;
  }

  // Sauvegarder des données pour l'utilisateur actuel
  save(key: string, data: any): void {
    const saveKey = this.getSaveKey(key);
    localStorage.setItem(saveKey, JSON.stringify(data));
  }

  // Charger des données pour l'utilisateur actuel
  load<T>(key: string, defaultValue?: T): T | null {
    try {
      const saveKey = this.getSaveKey(key);
      const saved = localStorage.getItem(saveKey);
      
      if (saved) {
        return JSON.parse(saved) as T;
      }
      
      return defaultValue || null;
    } catch (error) {
      console.error(`Erreur lors du chargement de ${key}:`, error);
      return defaultValue || null;
    }
  }

  // Supprimer des données
  delete(key: string): void {
    const saveKey = this.getSaveKey(key);
    localStorage.removeItem(saveKey);
  }

  // Sauvegarder l'état complet du jeu
  saveFullGame(gameData: {
    gameState: any;
    inventory: any;
    machines: any;
    research: any;
    market: any;
  }): void {
    const user = this.authService.currentUserValue;
    if (!user) return;

    const fullSave: GameSave = {
      userId: user.id,
      timestamp: Date.now(),
      ...gameData
    };

    this.save('fullsave', fullSave);
    console.log('💾 Partie sauvegardée pour', user.username);
  }

  // Charger l'état complet du jeu
  loadFullGame(): GameSave | null {
    return this.load<GameSave>('fullsave');
  }

  // Obtenir toutes les sauvegardes d'un utilisateur
  getAllUserSaves(): string[] {
    const user = this.authService.currentUserValue;
    if (!user) return [];

    const prefix = `factoquest_${user.id}_`;
    const saves: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        saves.push(key.replace(prefix, ''));
      }
    }

    return saves;
  }

  // Supprimer toutes les sauvegardes d'un utilisateur
  deleteAllUserSaves(): void {
    const saves = this.getAllUserSaves();
    saves.forEach(save => this.delete(save));
    console.log('🗑️ Toutes les sauvegardes supprimées');
  }

  // Exporter la sauvegarde (pour backup)
  exportSave(): string {
    const save = this.loadFullGame();
    return JSON.stringify(save, null, 2);
  }

  // Importer une sauvegarde
  importSave(saveData: string): boolean {
    try {
      const save = JSON.parse(saveData) as GameSave;
      this.save('fullsave', save);
      console.log('✅ Sauvegarde importée');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'import:', error);
      return false;
    }
  }
}