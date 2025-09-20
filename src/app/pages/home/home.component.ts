import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';

import { NavigationService, NavigationTab } from '../../services/navigation';
import { GameStateService } from '../../services/game-state';
import { MachineService } from '../../services/machine';

import { Dashboard } from '../dashboard/dashboard';
import { Mines } from '../mines/mines';
import { Furnaces } from '../furnaces/furnaces';
import { Assemblers } from '../assemblers/assemblers';

import { GameState } from '../../models/game.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    Dashboard,
    Mines,
    Furnaces,
    Assemblers
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  
  gameState$: Observable<GameState>;
  currentTab$: Observable<NavigationTab>;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private navigationService: NavigationService,
    private gameStateService: GameStateService,
    private machineService: MachineService
  ) {
    this.gameState$ = this.gameStateService.getGameState$();
    this.currentTab$ = this.navigationService.getCurrentTab$();
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
  }

  // Obtenir tous les onglets
  getTabs() {
    return this.navigationService.getTabs();
  }

  // Vérifier si un onglet est actif
  isTabActive(tab: NavigationTab): boolean {
    return this.navigationService.getCurrentTab() === tab;
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
      this.navigationService.setCurrentTab('dashboard');
      console.log('Jeu réinitialisé !');
    }
  }
}