// src/app/services/player-stats.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { SaveService } from './save.service';
import { NotificationService } from './notifications.service';
import { PlayerStats, PlayerProfile } from '../models/player.model';

@Injectable({
  providedIn: 'root'
})
export class PlayerStatsService {

  private statsSubject = new BehaviorSubject<PlayerStats | null>(null);
  public stats$ = this.statsSubject.asObservable();

  private profileSubject = new BehaviorSubject<PlayerProfile | null>(null);
  public profile$ = this.profileSubject.asObservable();

  constructor(
    private authService: AuthService,
    private saveService: SaveService,
    private notificationService: NotificationService
  ) {
    // Charger les stats quand l'utilisateur se connecte
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadStats();
        this.loadProfile();
      } else {
        this.statsSubject.next(null);
        this.profileSubject.next(null);
      }
    });
  }

  // Initialiser les stats pour un nouveau joueur
  private initializeStats(): PlayerStats | null {
    const user = this.authService.currentUserValue();
    if (!user) {
      console.warn('Impossible de créer des stats sans utilisateur connecté');
      return null;
    }

    return {
      userId: user.id,
      totalMoneyEarned: 0,
      totalMoneySpent: 0,
      totalPlayTime: 0,
      machinesBought: 0,
      resourcesProduced: 0,
      resourcesSold: 0,
      researchesCompleted: 0,
      specialOrdersCompleted: 0,
      highestMoney: 10000, // Argent de départ
      firstLoginDate: new Date(),
      lastLoginDate: new Date(),
      totalLogins: 1
    };
  }

  // Charger les stats
  private loadStats(): void {
    const user = this.authService.currentUserValue;
    if (!user) {
      this.statsSubject.next(null);
      return;
    }

    let stats = this.saveService.load<PlayerStats>('stats');
    
    if (!stats) {
      stats = this.initializeStats();
      if (stats) {
        this.saveStats(stats);
      }
    }

    if (stats) {
      // Mettre à jour la dernière connexion
      stats.lastLoginDate = new Date();
      stats.totalLogins++;
      
      this.statsSubject.next(stats);
      this.saveStats(stats);
    }
  }

  // Charger le profil
  private loadProfile(): void {
    const user = this.authService.currentUserValue();
    if (!user) {
      this.profileSubject.next(null);
      return;
    }

    let profile = this.saveService.load<PlayerProfile>('profile');
    
    if (!profile) {
      const stats = this.statsSubject.value || this.initializeStats();
      if (!stats) return;

      profile = {
        userId: user.id,
        username: user.username,
        email: user.email,
        stats: stats,
        achievements: [],
        level: 1,
        experience: 0,
        createdAt: new Date(),
        lastSaveAt: new Date()
      };
      this.saveProfile(profile);
    }

    this.profileSubject.next(profile);
  }

  // Sauvegarder les stats
  private saveStats(stats: PlayerStats): void {
    if (!this.authService.currentUserValue) {
      return; // Ne pas sauvegarder si pas connecté
    }
    this.saveService.save('stats', stats);
  }

  // Sauvegarder le profil
  private saveProfile(profile: PlayerProfile): void {
    if (!this.authService.currentUserValue) {
      return; // Ne pas sauvegarder si pas connecté
    }
    this.saveService.save('profile', profile);
  }

  // Obtenir les stats actuelles
  getStats(): PlayerStats | null {
    return this.statsSubject.value;
  }

  // Obtenir le profil actuel
  getProfile(): PlayerProfile | null {
    return this.profileSubject.value;
  }

  // Mettre à jour une stat
  private updateStat(updater: (stats: PlayerStats) => void): void {
    const stats = this.statsSubject.value;
    if (!stats) {
      console.warn('Impossible de mettre à jour les stats sans utilisateur connecté');
      return;
    }

    updater(stats);
    
    this.statsSubject.next({ ...stats });
    this.saveStats(stats);
    
    // Mettre à jour le profil également
    this.updateProfileStats(stats);
  }

  // Mettre à jour les stats du profil
  private updateProfileStats(stats: PlayerStats): void {
    const profile = this.profileSubject.value;
    if (!profile) {
      console.warn('Impossible de mettre à jour le profil sans utilisateur connecté');
      return;
    }

    profile.stats = stats;
    profile.lastSaveAt = new Date();
    
    this.profileSubject.next({ ...profile });
    this.saveProfile(profile);
  }

  // === Méthodes publiques pour tracker les actions ===

  trackMoneyEarned(amount: number): void {
    this.updateStat(stats => {
      stats.totalMoneyEarned += amount;
    });
    this.checkExperience(amount * 0.1); // 0.1 XP par crédit gagné
  }

  trackMoneySpent(amount: number): void {
    this.updateStat(stats => {
      stats.totalMoneySpent += amount;
    });
  }

  trackHighestMoney(currentMoney: number): void {
    this.updateStat(stats => {
      if (currentMoney > stats.highestMoney) {
        stats.highestMoney = currentMoney;
      }
    });
  }

  trackMachineBought(): void {
    this.updateStat(stats => {
      stats.machinesBought++;
    });
    this.checkExperience(50); // 50 XP par machine achetée
  }

  trackResourceProduced(quantity: number = 1): void {
    this.updateStat(stats => {
      stats.resourcesProduced += quantity;
    });
    this.checkExperience(quantity * 0.5); // 0.5 XP par ressource
  }

  trackResourceSold(quantity: number = 1): void {
    this.updateStat(stats => {
      stats.resourcesSold += quantity;
    });
    this.checkExperience(quantity * 1); // 1 XP par vente
  }

  trackResearchCompleted(): void {
    this.updateStat(stats => {
      stats.researchesCompleted++;
    });
    this.checkExperience(200); // 200 XP par recherche
  }

  trackSpecialOrderCompleted(): void {
    this.updateStat(stats => {
      stats.specialOrdersCompleted++;
    });
    this.checkExperience(500); // 500 XP par commande spéciale
  }

  trackPlayTime(milliseconds: number): void {
    this.updateStat(stats => {
      stats.totalPlayTime += milliseconds;
    });
  }

  // Système d'expérience et de niveau
  private checkExperience(xpGained: number): void {
    const profile = this.profileSubject.value;
    if (!profile) return;

    profile.experience += xpGained;

    // Calculer le niveau (formule: niveau = floor(sqrt(xp / 100)))
    const newLevel = Math.floor(Math.sqrt(profile.experience / 100)) + 1;
    
    if (newLevel > profile.level) {
      profile.level = newLevel;
      console.log(`🎉 Niveau ${newLevel} atteint !`);
      
      // Afficher la notification de level up
      this.notificationService.levelUp(newLevel);
    }

    this.profileSubject.next({ ...profile });
    this.saveProfile(profile);
  }

  // Obtenir l'XP nécessaire pour le prochain niveau
  getXpForNextLevel(): number {
    const profile = this.profileSubject.value;
    if (!profile) return 0;

    const nextLevel = profile.level + 1;
    return (nextLevel - 1) * (nextLevel - 1) * 100;
  }

  // Obtenir le pourcentage de progression vers le prochain niveau
  getLevelProgress(): number {
    const profile = this.profileSubject.value;
    if (!profile) return 0;

    const currentLevelXp = (profile.level - 1) * (profile.level - 1) * 100;
    const nextLevelXp = this.getXpForNextLevel();
    const xpInCurrentLevel = profile.experience - currentLevelXp;
    const xpNeededForLevel = nextLevelXp - currentLevelXp;

    return (xpInCurrentLevel / xpNeededForLevel) * 100;
  }

  // Obtenir le temps de jeu formaté
  getFormattedPlayTime(): string {
    const stats = this.statsSubject.value;
    if (!stats) return '0h 0m';

    const hours = Math.floor(stats.totalPlayTime / (1000 * 60 * 60));
    const minutes = Math.floor((stats.totalPlayTime % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  // Reset des stats (pour debug)
  reset(): void {
    const stats = this.initializeStats();
    if (!stats) {
      console.warn('Impossible de reset sans utilisateur connecté');
      return;
    }
    
    this.statsSubject.next(stats);
    this.saveStats(stats);
    
    const user = this.authService.currentUserValue();
    if (user) {
      const profile: PlayerProfile = {
        userId: user.id,
        username: user.username,
        email: user.email,
        stats: stats,
        achievements: [],
        level: 1,
        experience: 0,
        createdAt: new Date(),
        lastSaveAt: new Date()
      };
      this.profileSubject.next(profile);
      this.saveProfile(profile);
    }
  }
}