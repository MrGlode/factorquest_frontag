import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NavigationTab = 'dashboard' | 'mines' | 'furnaces' | 'assemblers' | 'market' | 'research';

export interface TabInfo {
  id: NavigationTab;
  label: string;
  icon: string;
  badge?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  private currentTabSubject = new BehaviorSubject<NavigationTab>('dashboard');
  
  // Définition des onglets
  private tabs: TabInfo[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: '📊' },
    { id: 'mines', label: 'Mines', icon: '🏔️' },
    { id: 'furnaces', label: 'Fours', icon: '🔥' },
    { id: 'assemblers', label: 'Assembleurs', icon: '⚙️' },
    { id: 'research', label: 'Recherche', icon: '🔬' },
    { id: 'market', label: 'Marché', icon: '🏪' }
  ];

  constructor() {}

  // Observable pour l'onglet actuel
  getCurrentTab$(): Observable<NavigationTab> {
    return this.currentTabSubject.asObservable();
  }

  // Obtenir l'onglet actuel
  getCurrentTab(): NavigationTab {
    return this.currentTabSubject.value;
  }

  // Changer d'onglet
  setCurrentTab(tab: NavigationTab): void {
    this.currentTabSubject.next(tab);
  }

  // Obtenir tous les onglets
  getTabs(): TabInfo[] {
    return [...this.tabs];
  }

  // Obtenir un onglet spécifique
  getTab(id: NavigationTab): TabInfo | undefined {
    return this.tabs.find(tab => tab.id === id);
  }

  // Mettre à jour le badge d'un onglet (pour les notifications)
  updateTabBadge(tabId: NavigationTab, count: number): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.badge = count > 0 ? count : undefined;
    }
  }
}