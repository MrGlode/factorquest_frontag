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
    private machineService: MachineService,
    private inventoryService: InventoryService,
    private marketService: MarketService,
    private researchService: ResearchService
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
    if (confirm('Êtes-vous sûr de vouloir tout recommencer ? Cela effacera TOUS vos progrès (machines, recherches, argent, inventaire, etc.)')) {
      // Reset de tous les services dans l'ordre approprié
      console.log('🔄 Réinitialisation complète du jeu...');
      
      // 1. Reset de la recherche (doit être fait en premier car les machines peuvent en dépendre)
      this.researchService.reset();
      console.log('✅ Recherches réinitialisées');
      
      // 2. Reset des machines 
      this.machineService.reset();
      console.log('✅ Machines réinitialisées');
      
      // 3. Reset de l'inventaire
      this.inventoryService.reset();
      console.log('✅ Inventaire réinitialisé');
      
      // 4. Reset du marché
      this.marketService.reset();
      console.log('✅ Marché réinitialisé');
      
      // 5. Reset de l'état du jeu (doit être fait en dernier)
      this.gameStateService.reset();
      console.log('✅ État du jeu réinitialisé');
      
      // 6. Redirection vers le dashboard
      this.router.navigate(['/dashboard']);
      console.log('🎮 Jeu complètement réinitialisé ! Bon redémarrage !');
      
      alert('🎮 Jeu réinitialisé avec succès ! Bienvenue dans votre nouvel empire !');
    }
  }
}