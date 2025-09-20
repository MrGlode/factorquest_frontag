import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';

import { ResearchService } from '../../services/research';
import { GameStateService } from '../../services/game-state';
import { InventoryService } from '../../services/inventory';
import { RecipeService } from '../../services/recipe';

import { Laboratory, Research, ResearchProgress, Inventory, Resource } from '../../models/game.model';

@Component({
  selector: 'app-research',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './research.html',
  styleUrl: './research.scss'
})
export class ResearchComponent implements OnInit, OnDestroy {
  
  laboratories$: Observable<Laboratory[]>;
  researches$: Observable<Research[]>;
  activeResearches$: Observable<ResearchProgress[]>;
  inventory$: Observable<Inventory>;
  
  selectedCategory: 'all' | 'mine' | 'furnace' | 'assembler' | 'general' = 'all';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private researchService: ResearchService,
    private gameStateService: GameStateService,
    private inventoryService: InventoryService,
    private recipeService: RecipeService
  ) {
    this.laboratories$ = this.researchService.getLaboratories$();
    this.researches$ = this.researchService.getResearches$();
    this.activeResearches$ = this.researchService.getActiveResearches$();
    this.inventory$ = this.inventoryService.getInventory$();
  }

  ngOnInit(): void {
    // Initialisation si nécessaire
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Acheter un laboratoire
  purchaseLaboratory(type: string): void {
    const labTypeKey = type as keyof ReturnType<typeof this.researchService.getAllLaboratoryTypes>;
    const labInfo = this.researchService.getLaboratoryTypeInfo(labTypeKey);
    
    if (this.gameStateService.canAfford(labInfo.cost)) {
      if (this.gameStateService.spendMoney(labInfo.cost)) {
        const laboratory = this.researchService.purchaseLaboratory(labTypeKey);
        alert(`Laboratoire acheté: ${laboratory.name} pour ${labInfo.cost} crédits !`);
      }
    } else {
      alert('Pas assez d\'argent pour acheter ce laboratoire !');
    }
  }

  // Démarrer une recherche
  startResearch(researchId: string, laboratoryId: string): void {
    const inventory = this.inventoryService.getInventory();
    const result = this.researchService.startResearch(researchId, laboratoryId, inventory);
    
    if (result.success) {
      // Récupérer la recherche pour accéder aux requirements
      this.researches$.subscribe(researches => {
        const research = researches.find(r => r.id === researchId);
        if (research) {
          // Retirer les ressources de l'inventaire
          research.requirements.forEach(req => {
            this.inventoryService.removeResource(req.resourceId, req.quantity);
          });
        }
      }).unsubscribe(); // Se désabonner immédiatement après usage
      
      alert(result.message);
    } else {
      alert(result.message);
    }
  }

  // Obtenir une recherche par ID
  private getResearchById(researchId: string): Research | undefined {
    // Cette méthode sera mise à jour quand on aura accès aux recherches
    return undefined;
  }

  // Obtenir une recherche par ID depuis la liste actuelle
  getResearchByIdFromList(researchId: string, researches: Research[]): Research | undefined {
    return researches.find(r => r.id === researchId);
  }

  // Obtenir une ressource par ID
  getResource(resourceId: string): Resource | undefined {
    return this.recipeService.getResource(resourceId);
  }

  // Obtenir la quantité disponible d'une ressource
  getAvailableQuantity(resourceId: string): number {
    return this.inventoryService.getResourceQuantity(resourceId);
  }

  // Vérifier si on peut démarrer une recherche
  canStartResearch(research: Research): boolean {
    return research.isUnlocked && 
           !research.isCompleted && 
           !research.isInProgress &&
           research.requirements.every(req => 
             this.getAvailableQuantity(req.resourceId) >= req.quantity
           );
  }

  // Vérifier si on peut acheter un laboratoire
  canAffordLaboratory(type: string): boolean {
    const labTypeKey = type as keyof ReturnType<typeof this.researchService.getAllLaboratoryTypes>;
    const labInfo = this.researchService.getLaboratoryTypeInfo(labTypeKey);
    return this.gameStateService.canAfford(labInfo.cost);
  }

  // Filtrer les recherches par catégorie
  filterResearches(researches: Research[]): Research[] {
    if (this.selectedCategory === 'all') {
      return researches;
    }
    return researches.filter(research => research.category === this.selectedCategory);
  }

  // Obtenir les laboratoires disponibles pour une recherche
  getAvailableLaboratories(research: Research, laboratories: Laboratory[]): Laboratory[] {
    return laboratories.filter(lab => 
      lab.specialization === 'general' || 
      lab.specialization === research.category ||
      !lab.specialization
    );
  }

  // Obtenir le progrès d'une recherche active
  getResearchProgress(researchId: string, activeResearches: ResearchProgress[]): ResearchProgress | undefined {
    return activeResearches.find(ar => ar.researchId === researchId);
  }

  // Obtenir le temps restant d'une recherche
  getTimeRemaining(progress: ResearchProgress): string {
    const now = Date.now();
    const remaining = progress.estimatedEndTime - now;
    
    if (remaining <= 0) return 'Terminé';
    
    const minutes = Math.floor(remaining / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Obtenir les types de laboratoires
  getLaboratoryTypes() {
    return this.researchService.getAllLaboratoryTypes();
  }

  // Obtenir la couleur selon le statut de recherche
  getResearchStatusColor(research: Research): string {
    if (research.isCompleted) return '#228B22';
    if (research.isInProgress) return '#DAA520';
    if (research.isUnlocked) return '#4682B4';
    return '#666666';
  }

  // Obtenir le texte du statut
  getResearchStatusText(research: Research): string {
    if (research.isCompleted) return 'Terminée';
    if (research.isInProgress) return 'En cours';
    if (research.isUnlocked) return 'Disponible';
    return 'Verrouillée';
  }

  // Formater la durée
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }

  // Obtenir les effets actifs
  getActiveEffects() {
    return this.researchService.getActiveEffects();
  }

  // Obtenir le nombre de recherches en cours pour un laboratoire
  getActiveResearchCount(laboratoryId: string, activeResearches: ResearchProgress[]): number {
    return activeResearches.filter(ar => ar.laboratoryId === laboratoryId).length;
  }
}