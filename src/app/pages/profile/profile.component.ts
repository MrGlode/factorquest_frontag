// src/app/pages/profile/profile.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

import { PlayerStatsService } from '../../services/player-stats.service';
import { AchievementsService } from '../../services/achievements.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import { PlayerProfile, PlayerStats, Achievement, AchievementProgress } from '../../models/player.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {

  profile$: Observable<PlayerProfile | null>;
  stats$: Observable<PlayerStats | null>;
  achievements$: Observable<Achievement[]>;
  progress$: Observable<AchievementProgress[]>;
  
  selectedTab: 'stats' | 'achievements' = 'stats';

  constructor(
    public playerStatsService: PlayerStatsService,
    public achievementsService: AchievementsService,
    public leaderboardService: LeaderboardService
  ) {
    this.profile$ = this.playerStatsService.profile$;
    this.stats$ = this.playerStatsService.stats$;
    this.achievements$ = this.achievementsService.achievements$;
    this.progress$ = this.achievementsService.progress$;
  }

  ngOnInit(): void {
    // Rafraîchir les données
    this.leaderboardService.refresh();
  }

  // Changer d'onglet
  switchTab(tab: 'stats' | 'achievements'): void {
    this.selectedTab = tab;
  }

  // Formater le temps de jeu
  formatPlayTime(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  // Formater un nombre avec espaces
  formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // Obtenir la couleur de la catégorie d'achievement
  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      production: '#4caf50',
      economy: '#ffc107',
      research: '#2196f3',
      collection: '#9c27b0',
      special: '#ff5722'
    };
    return colors[category] || '#666';
  }

  // Obtenir le label de la catégorie
  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      production: 'Production',
      economy: 'Économie',
      research: 'Recherche',
      collection: 'Collection',
      special: 'Spécial'
    };
    return labels[category] || category;
  }

  // Débloquer l'achievement secret (Easter egg)
  unlockSecret(): void {
    this.achievementsService.unlockSecretAchievement();
  }
}