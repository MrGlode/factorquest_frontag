// src/app/pages/leaderboard/leaderboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

import { LeaderboardService } from '../../services/leaderboard.service';
import { AuthService } from '../../services/auth.service';
import { LeaderboardEntry } from '../../models/player.model';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.scss'
})
export class LeaderboardComponent implements OnInit {

  leaderboard$: Observable<LeaderboardEntry[]>;
  selectedView: 'top' | 'around' = 'top';

  constructor(
    public leaderboardService: LeaderboardService,
    public authService: AuthService
  ) {
    this.leaderboard$ = this.leaderboardService.leaderboard$;
  }

  ngOnInit(): void {
    this.leaderboardService.refresh();
  }

  // Obtenir les joueurs à afficher selon la vue
  getDisplayedPlayers(): LeaderboardEntry[] {
    if (this.selectedView === 'top') {
      return this.leaderboardService.getTopPlayers(10);
    } else {
      return this.leaderboardService.getPlayersAroundCurrent(3);
    }
  }

  // Changer de vue
  switchView(view: 'top' | 'around'): void {
    this.selectedView = view;
  }

  // Vérifier si c'est le joueur actuel
  isCurrentPlayer(entry: LeaderboardEntry): boolean {
    const user = this.authService.currentUserValue;
    return user?.id === entry.userId;
  }

  // Obtenir la classe CSS pour le rang
  getRankClass(rank: number): string {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  }

  // Obtenir l'icône du rang
  getRankIcon(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }

  // Formater un nombre avec espaces
  formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // Rafraîchir le classement
  refresh(): void {
    this.leaderboardService.refresh();
  }
}