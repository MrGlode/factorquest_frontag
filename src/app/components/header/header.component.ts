import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';

import { NavigationService, NavigationTab } from '../../services/navigation';
import { GameStateService } from '../../services/game-state';
import { MachineService } from '../../services/machine';
import { InventoryService } from '../../services/inventory';
import { MarketService } from '../../services/market';
import { ResearchService } from '../../services/research';
import { AuthService } from'../../services/auth.service';
import { PlayerStatsService } from '../../services/player-stats.service';

import { GameState } from '../../models/game.model';
import { User } from '../../models/user.model';
import { PlayerProfile } from '../../models/player.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  
  gameState$: Observable<GameState>;
  currentUser$: Observable<User | null>;
  profile$: Observable<PlayerProfile | null>;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private navigationService: NavigationService,
    private gameStateService: GameStateService,
    private machineService: MachineService,
    private inventoryService: InventoryService,
    private marketService: MarketService,
    private researchService: ResearchService,
    private authService: AuthService,
    public playerStatsService: PlayerStatsService
  ) {
    this.gameState$ = this.gameStateService.getGameState$();
    this.currentUser$ = this.authService.currentUser$;
    this.profile$ = this.playerStatsService.profile$;
  }

  ngOnInit(): void {
    // Mettre à jour les badges des onglets avec le nombre de machines
    this.updateTabBadges();
    
    // S'abonner aux changements de machines pour mettre à jour les badges
    const machinesSub = this.machineService.getMachines$().subscribe(() => {
      this.updateTabBadges();
    });
    this.subscriptions.push(machinesSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Navigation entre onglets
  switchTab(tab: NavigationTab): void {
    this.navigationService.setCurrentTab(tab);
    this.router.navigate([`/${tab}`]);
  }

  // Obtenir tous les onglets
  getTabs() {
    return this.navigationService.getTabs();
  }

  // Vérifier si un onglet est actif
  isTabActive(tab: NavigationTab): boolean {
    const currentUrl = this.router.url;
    return currentUrl.includes(tab) || (currentUrl === '/' && tab === 'dashboard');
  }

  // Mettre à jour les badges avec le nombre de machines
  private updateTabBadges(): void {
    const machines = this.machineService.getMachines();
    
    const mineCount = machines.filter(m => m.type === 'mine').length;
    const furnaceCount = machines.filter(m => m.type === 'furnace').length;
    const assemblerCount = machines.filter(m => m.type === 'assembler').length;
    
    this.navigationService.updateTabBadge('mines', mineCount);
    this.navigationService.updateTabBadge('furnaces', furnaceCount);
    this.navigationService.updateTabBadge('assemblers', assemblerCount);
  }

  // Debug: reset du jeu
  resetGame(): void {
    if (confirm('Êtes-vous sûr de vouloir tout recommencer ? Cela effacera TOUS vos progrès (machines, recherches, argent, inventaire, etc.)')) {
      
      this.gameStateService.reset();
      this.router.navigate(['/dashboard']);
     
      alert('🎮 Jeu réinitialisé avec succès ! Bienvenue dans votre nouvel empire !');
    }
  }

  // Déconnexion
  logout(): void {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}