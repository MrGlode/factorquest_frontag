import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';

import { NavigationService, NavigationTab } from '../../services/navigation';
import { GameStateService } from '../../services/game-state';
import { MachineService } from '../../services/machine';

import { GameState } from '../../models/game.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  
  gameState$: Observable<GameState>;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private navigationService: NavigationService,
    private gameStateService: GameStateService,
    private machineService: MachineService
  ) {
    this.gameState$ = this.gameStateService.getGameState$();
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
    if (confirm('Êtes-vous sûr de vouloir recommencer ?')) {
      this.gameStateService.reset();
      this.router.navigate(['/dashboard']);
      console.log('Jeu réinitialisé !');
    }
  }
}