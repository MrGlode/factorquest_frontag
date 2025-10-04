// src/app/services/leaderboard.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { PlayerStatsService } from './player-stats.service';
import { AchievementsService } from './achievements.service';
import { LeaderboardEntry } from '../models/player.model';

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {

  private leaderboardSubject = new BehaviorSubject<LeaderboardEntry[]>([]);
  public leaderboard$ = this.leaderboardSubject.asObservable();

  // Stockage mocké des profils de tous les joueurs (en prod, ce serait en BDD)
  private mockPlayers = new Map<string, LeaderboardEntry>();

  constructor(
    private authService: AuthService,
    private playerStatsService: PlayerStatsService,
    private achievementsService: AchievementsService
  ) {
    this.initializeMockPlayers();
    this.loadLeaderboard();

    // Mettre à jour le leaderboard quand les stats changent
    this.playerStatsService.stats$.subscribe(() => {
      this.updateCurrentPlayer();
      this.loadLeaderboard();
    });
  }

  // Initialiser des joueurs factices pour le leaderboard
  private initializeMockPlayers(): void {
    const mockData = [
      { username: 'ProGamer123', score: 150000, level: 15, achievements: 8 },
      { username: 'IndustrialMaster', score: 120000, level: 12, achievements: 10 },
      { username: 'FactoryKing', score: 95000, level: 10, achievements: 6 },
      { username: 'ResourceQueen', score: 87000, level: 9, achievements: 7 },
      { username: 'MachineWizard', score: 65000, level: 8, achievements: 5 }
    ];

    mockData.forEach((data, index) => {
      const entry: LeaderboardEntry = {
        userId: `mock_${index}`,
        username: data.username,
        score: data.score,
        rank: index + 1,
        stats: {
          userId: `mock_${index}`,
          totalMoneyEarned: data.score,
          totalMoneySpent: data.score * 0.7,
          totalPlayTime: (data.level * 3600000),
          machinesBought: data.level * 2,
          resourcesProduced: data.score / 10,
          resourcesSold: data.score / 20,
          researchesCompleted: data.level,
          specialOrdersCompleted: Math.floor(data.level / 2),
          highestMoney: data.score,
          firstLoginDate: new Date(),
          lastLoginDate: new Date(),
          totalLogins: data.level * 10
        },
        achievementsCount: data.achievements,
        level: data.level
      };

      this.mockPlayers.set(entry.userId, entry);
    });
  }

  // Mettre à jour l'entrée du joueur actuel
  private updateCurrentPlayer(): void {
    const user = this.authService.currentUserValue;
    const stats = this.playerStatsService.getStats();
    const profile = this.playerStatsService.getProfile();
    
    if (!user || !stats || !profile) return;

    const entry: LeaderboardEntry = {
      userId: user.id,
      username: user.username,
      score: this.calculateScore(stats),
      rank: 0, // Sera calculé après le tri
      stats: stats,
      achievementsCount: this.achievementsService.getUnlockedCount(),
      level: profile.level
    };

    this.mockPlayers.set(user.id, entry);
  }

  // Calculer le score d'un joueur (formule personnalisable)
  private calculateScore(stats: any): number {
    return (
      stats.totalMoneyEarned * 1.0 +
      stats.machinesBought * 500 +
      stats.resourcesProduced * 0.5 +
      stats.researchesCompleted * 1000 +
      stats.specialOrdersCompleted * 2000
    );
  }

  // Charger et trier le leaderboard
  private loadLeaderboard(): void {
    // Convertir en tableau et trier par score
    const entries = Array.from(this.mockPlayers.values())
      .sort((a, b) => b.score - a.score);

    // Attribuer les rangs
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    this.leaderboardSubject.next(entries);
  }

  // Obtenir le leaderboard complet
  public getLeaderboard(): LeaderboardEntry[] {
    return this.leaderboardSubject.value;
  }

  // Obtenir le top N joueurs
  public getTopPlayers(n: number): LeaderboardEntry[] {
    return this.leaderboardSubject.value.slice(0, n);
  }

  // Obtenir le rang du joueur actuel
  public getCurrentPlayerRank(): number {
    const user = this.authService.currentUserValue;
    if (!user) return 0;

    const entry = this.mockPlayers.get(user.id);
    return entry?.rank || 0;
  }

  // Obtenir l'entrée du joueur actuel
  public getCurrentPlayerEntry(): LeaderboardEntry | null {
    const user = this.authService.currentUserValue;
    if (!user) return null;

    return this.mockPlayers.get(user.id) || null;
  }

  // Obtenir les joueurs autour du joueur actuel (contexte)
  public getPlayersAroundCurrent(range: number = 2): LeaderboardEntry[] {
    const currentRank = this.getCurrentPlayerRank();
    if (currentRank === 0) return [];

    const allPlayers = this.leaderboardSubject.value;
    const start = Math.max(0, currentRank - range - 1);
    const end = Math.min(allPlayers.length, currentRank + range);

    return allPlayers.slice(start, end);
  }

  // Rafraîchir le leaderboard
  public refresh(): void {
    this.updateCurrentPlayer();
    this.loadLeaderboard();
  }
}