import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Laboratory, Research, ResearchProgress, ResearchEffect } from '../models/game.model';

@Injectable({
  providedIn: 'root'
})
export class ResearchService {

  private laboratories: Laboratory[] = [];
  private researches: Research[] = [];
  private activeResearches: ResearchProgress[] = [];
  private completedResearches: string[] = [];
  
  private laboratoriesSubject = new BehaviorSubject<Laboratory[]>(this.laboratories);
  private researchesSubject = new BehaviorSubject<Research[]>(this.researches);
  private activeResearchesSubject = new BehaviorSubject<ResearchProgress[]>(this.activeResearches);
  
  private nextLabId = 1;

  // Types de laboratoires disponibles
  private laboratoryTypes = {
    basic: { 
      name: 'Laboratoire de Base', 
      cost: 5000, 
      researchSpeed: 1.0, 
      maxSimultaneous: 1, 
      icon: '🧪',
      description: 'Recherches fondamentales' 
    },
    advanced: { 
      name: 'Laboratoire Avancé', 
      cost: 15000, 
      researchSpeed: 1.5, 
      maxSimultaneous: 2, 
      icon: '⚗️',
      description: 'Recherches complexes, +50% vitesse' 
    },
    institute: { 
      name: 'Institut de Recherche', 
      cost: 50000, 
      researchSpeed: 2.0, 
      maxSimultaneous: 3, 
      icon: '🔬',
      description: 'Recherches avancées, +100% vitesse' 
    },
    mining: { 
      name: 'Laboratoire Minier', 
      cost: 8000, 
      researchSpeed: 1.3, 
      maxSimultaneous: 1, 
      icon: '⛏️',
      description: 'Spécialisé dans les technologies minières' 
    },
    metallurgy: { 
      name: 'Laboratoire de Métallurgie', 
      cost: 12000, 
      researchSpeed: 1.3, 
      maxSimultaneous: 1, 
      icon: '🔥',
      description: 'Spécialisé dans les technologies de fonte' 
    },
    mechanical: { 
      name: 'Laboratoire Mécanique', 
      cost: 18000, 
      researchSpeed: 1.3, 
      maxSimultaneous: 1, 
      icon: '⚙️',
      description: 'Spécialisé dans les technologies d\'assemblage' 
    }
  };

  constructor() {
    this.initializeResearches();
    this.loadFromStorage();
    this.startResearchLoop();
  }

  // Observables
  getLaboratories$(): Observable<Laboratory[]> {
    return this.laboratoriesSubject.asObservable();
  }

  getResearches$(): Observable<Research[]> {
    return this.researchesSubject.asObservable();
  }

  getActiveResearches$(): Observable<ResearchProgress[]> {
    return this.activeResearchesSubject.asObservable();
  }

  // Initialiser les recherches disponibles
  private initializeResearches(): void {
    this.researches = [
      // Recherches mines
      {
        id: 'mining_speed_1',
        name: 'Extraction Rapide I',
        description: 'Améliore la vitesse d\'extraction des mines de 25%',
        category: 'mine',
        requirements: [
          { resourceId: 'iron_plate', quantity: 50 },
          { resourceId: 'gear', quantity: 10 }
        ],
        duration: 300, // 5 minutes
        prerequisites: [],
        effects: [
          { type: 'speed', target: 'mine', value: 25, description: '+25% vitesse extraction' }
        ],
        icon: '⛏️',
        isUnlocked: true,
        isCompleted: false,
        isInProgress: false
      },
      {
        id: 'mining_efficiency_1',
        name: 'Double Extraction',
        description: '10% de chance d\'extraire un minerai bonus',
        category: 'mine',
        requirements: [
          { resourceId: 'iron_plate', quantity: 100 },
          { resourceId: 'copper_plate', quantity: 50 },
          { resourceId: 'gear', quantity: 25 }
        ],
        duration: 600, // 10 minutes
        prerequisites: ['mining_speed_1'],
        effects: [
          { type: 'bonus_output', target: 'mine', value: 10, description: '+10% chance minerai bonus' }
        ],
        icon: '💎',
        isUnlocked: false,
        isCompleted: false,
        isInProgress: false
      },

      // Recherches fours
      {
        id: 'smelting_speed_1',
        name: 'Fonte Accélérée I',
        description: 'Améliore la vitesse de fonte des fours de 30%',
        category: 'furnace',
        requirements: [
          { resourceId: 'iron_plate', quantity: 75 },
          { resourceId: 'coal', quantity: 100 }
        ],
        duration: 420, // 7 minutes
        prerequisites: [],
        effects: [
          { type: 'speed', target: 'furnace', value: 30, description: '+30% vitesse fonte' }
        ],
        icon: '🔥',
        isUnlocked: true,
        isCompleted: false,
        isInProgress: false
      },
      {
        id: 'fuel_efficiency_1',
        name: 'Économie de Combustible',
        description: 'Réduit la consommation de charbon de 25%',
        category: 'furnace',
        requirements: [
          { resourceId: 'iron_plate', quantity: 80 },
          { resourceId: 'copper_plate', quantity: 40 },
          { resourceId: 'iron_wire', quantity: 20 }
        ],
        duration: 480, // 8 minutes
        prerequisites: ['smelting_speed_1'],
        effects: [
          { type: 'cost_reduction', target: 'furnace', value: 25, description: '-25% consommation charbon' }
        ],
        icon: '⚡',
        isUnlocked: false,
        isCompleted: false,
        isInProgress: false
      },

      // Recherches assembleurs
      {
        id: 'assembly_speed_1',
        name: 'Assemblage Rapide I',
        description: 'Améliore la vitesse d\'assemblage de 35%',
        category: 'assembler',
        requirements: [
          { resourceId: 'iron_plate', quantity: 60 },
          { resourceId: 'iron_wire', quantity: 30 },
          { resourceId: 'gear', quantity: 15 }
        ],
        duration: 540, // 9 minutes
        prerequisites: [],
        effects: [
          { type: 'speed', target: 'assembler', value: 35, description: '+35% vitesse assemblage' }
        ],
        icon: '⚙️',
        isUnlocked: true,
        isCompleted: false,
        isInProgress: false
      },
      {
        id: 'precision_assembly',
        name: 'Assemblage de Précision',
        description: '15% de chance de produire un item bonus',
        category: 'assembler',
        requirements: [
          { resourceId: 'iron_plate', quantity: 120 },
          { resourceId: 'copper_plate', quantity: 80 },
          { resourceId: 'gear', quantity: 40 }
        ],
        duration: 720, // 12 minutes
        prerequisites: ['assembly_speed_1'],
        effects: [
          { type: 'bonus_output', target: 'assembler', value: 15, description: '+15% chance item bonus' }
        ],
        icon: '🎯',
        isUnlocked: false,
        isCompleted: false,
        isInProgress: false
      },

      // Recherches générales
      {
        id: 'automation_1',
        name: 'Automatisation I',
        description: 'Améliore l\'efficacité de toutes les machines de 20%',
        category: 'general',
        requirements: [
          { resourceId: 'iron_plate', quantity: 200 },
          { resourceId: 'copper_plate', quantity: 100 },
          { resourceId: 'iron_wire', quantity: 50 },
          { resourceId: 'gear', quantity: 30 }
        ],
        duration: 900, // 15 minutes
        prerequisites: ['mining_speed_1', 'smelting_speed_1', 'assembly_speed_1'],
        effects: [
          { type: 'efficiency', target: 'all', value: 20, description: '+20% efficacité générale' }
        ],
        icon: '🤖',
        isUnlocked: false,
        isCompleted: false,
        isInProgress: false
      }
    ];

    this.updateResearchAvailability();
    this.researchesSubject.next([...this.researches]);
  }

  // Acheter un laboratoire
  purchaseLaboratory(type: keyof typeof this.laboratoryTypes): Laboratory {
    const labType = this.laboratoryTypes[type];
    const specialization = this.getSpecializationForType(type);
    
    const laboratory: Laboratory = {
      id: `lab_${this.nextLabId++}`,
      name: `${labType.name} #${this.nextLabId - 1}`,
      type: type,
      cost: labType.cost,
      researchSpeed: labType.researchSpeed,
      maxSimultaneousResearch: labType.maxSimultaneous,
      specialization: specialization,
      purchaseTime: Date.now()
    };

    this.laboratories.push(laboratory);
    this.laboratoriesSubject.next([...this.laboratories]);
    this.saveToStorage();
    
    return laboratory;
  }

  private getSpecializationForType(type: string): 'mine' | 'furnace' | 'assembler' | 'general' {
    const specializations = {
      mining: 'mine' as const,
      metallurgy: 'furnace' as const,
      mechanical: 'assembler' as const
    };
    return specializations[type as keyof typeof specializations] || 'general';
  }

  // Commencer une recherche
  startResearch(researchId: string, laboratoryId: string, availableResources: { [key: string]: number }): { success: boolean; message: string } {
    const research = this.researches.find(r => r.id === researchId);
    const laboratory = this.laboratories.find(l => l.id === laboratoryId);
    
    if (!research || !laboratory) {
      return { success: false, message: 'Recherche ou laboratoire introuvable' };
    }

    if (!research.isUnlocked) {
      return { success: false, message: 'Recherche non débloquée' };
    }

    if (research.isCompleted || research.isInProgress) {
      return { success: false, message: 'Recherche déjà effectuée ou en cours' };
    }

    // Vérifier si le laboratoire peut faire cette recherche
    if (laboratory.specialization && laboratory.specialization !== 'general' && 
        laboratory.specialization !== research.category) {
      return { success: false, message: 'Ce laboratoire ne peut pas effectuer cette recherche' };
    }

    // Vérifier si le laboratoire a de la place
    const currentResearches = this.activeResearches.filter(r => r.laboratoryId === laboratoryId);
    if (currentResearches.length >= laboratory.maxSimultaneousResearch) {
      return { success: false, message: 'Laboratoire déjà occupé' };
    }

    // Vérifier les ressources
    for (const req of research.requirements) {
      if ((availableResources[req.resourceId] || 0) < req.quantity) {
        return { success: false, message: `Pas assez de ${req.resourceId}` };
      }
    }

    // Démarrer la recherche
    const duration = research.duration / laboratory.researchSpeed; // Appliquer le bonus de vitesse
    const startTime = Date.now();
    
    const progress: ResearchProgress = {
      researchId,
      laboratoryId,
      startTime,
      estimatedEndTime: startTime + (duration * 1000),
      progress: 0
    };

    this.activeResearches.push(progress);
    research.isInProgress = true;
    research.startTime = startTime;
    research.laboratoryId = laboratoryId;

    this.activeResearchesSubject.next([...this.activeResearches]);
    this.researchesSubject.next([...this.researches]);
    this.saveToStorage();

    return { success: true, message: 'Recherche démarrée !' };
  }

  // Boucle de progression des recherches
  private startResearchLoop(): void {
    setInterval(() => {
      this.updateResearchProgress();
    }, 1000); // Mise à jour chaque seconde
  }

  private updateResearchProgress(): void {
    const now = Date.now();
    let hasChanges = false;

    this.activeResearches = this.activeResearches.filter(progress => {
      const timeElapsed = now - progress.startTime;
      const totalDuration = progress.estimatedEndTime - progress.startTime;
      progress.progress = Math.min(timeElapsed / totalDuration, 1);

      if (progress.progress >= 1) {
        // Recherche terminée
        this.completeResearch(progress.researchId);
        hasChanges = true;
        return false; // Retirer de la liste active
      }
      return true;
    });

    if (hasChanges) {
      this.activeResearchesSubject.next([...this.activeResearches]);
      this.researchesSubject.next([...this.researches]);
      this.updateResearchAvailability();
      this.saveToStorage();
    }
  }

  // Terminer une recherche
  private completeResearch(researchId: string): void {
    const research = this.researches.find(r => r.id === researchId);
    if (research) {
      research.isCompleted = true;
      research.isInProgress = false;
      this.completedResearches.push(researchId);
      
      console.log(`Recherche terminée: ${research.name}`);
      // Ici on pourrait ajouter une notification
    }
  }

  // Mettre à jour la disponibilité des recherches
  private updateResearchAvailability(): void {
    this.researches.forEach(research => {
      if (!research.isCompleted && !research.isUnlocked) {
        const prerequisitesMet = research.prerequisites.every(prereqId => 
          this.completedResearches.includes(prereqId)
        );
        research.isUnlocked = prerequisitesMet;
      }
    });
  }

  // Obtenir les effets actifs
  getActiveEffects(): ResearchEffect[] {
    const effects: ResearchEffect[] = [];
    this.completedResearches.forEach(researchId => {
      const research = this.researches.find(r => r.id === researchId);
      if (research) {
        effects.push(...research.effects);
      }
    });
    return effects;
  }

  // Obtenir les bonus pour un type de machine
  getBonusForMachineType(machineType: 'mine' | 'furnace' | 'assembler'): { speed: number; efficiency: number; bonusOutput: number } {
    const effects = this.getActiveEffects();
    let speed = 0;
    let efficiency = 0;
    let bonusOutput = 0;

    effects.forEach(effect => {
      if (effect.target === machineType || effect.target === 'all') {
        switch (effect.type) {
          case 'speed':
            speed += effect.value;
            break;
          case 'efficiency':
            efficiency += effect.value;
            break;
          case 'bonus_output':
            bonusOutput += effect.value;
            break;
        }
      }
    });

    return { speed, efficiency, bonusOutput };
  }

  // Obtenir les infos d'un type de laboratoire
  getLaboratoryTypeInfo(type: keyof typeof this.laboratoryTypes) {
    return this.laboratoryTypes[type];
  }

  // Obtenir tous les types de laboratoires
  getAllLaboratoryTypes() {
    return this.laboratoryTypes;
  }

  // Sauvegarder et charger
  private saveToStorage(): void {
    const data = {
      laboratories: this.laboratories,
      researches: this.researches,
      activeResearches: this.activeResearches,
      completedResearches: this.completedResearches,
      nextLabId: this.nextLabId
    };
    localStorage.setItem('factoquest_research', JSON.stringify(data));
  }

  private loadFromStorage(): void {
    const saved = localStorage.getItem('factoquest_research');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.laboratories = data.laboratories || [];
        this.completedResearches = data.completedResearches || [];
        this.activeResearches = data.activeResearches || [];
        this.nextLabId = data.nextLabId || 1;
        
        // Mettre à jour les recherches avec les données sauvegardées
        if (data.researches) {
          data.researches.forEach((savedResearch: any) => {
            const research = this.researches.find(r => r.id === savedResearch.id);
            if (research) {
              research.isCompleted = savedResearch.isCompleted;
              research.isInProgress = savedResearch.isInProgress;
              research.startTime = savedResearch.startTime;
              research.laboratoryId = savedResearch.laboratoryId;
            }
          });
        }
        
        this.updateResearchAvailability();
        
        this.laboratoriesSubject.next([...this.laboratories]);
        this.researchesSubject.next([...this.researches]);
        this.activeResearchesSubject.next([...this.activeResearches]);
      } catch (error) {
        console.error('Erreur lors du chargement de la recherche:', error);
      }
    }
  }

  // Reset pour debug
  reset(): void {
    this.laboratories = [];
    this.activeResearches = [];
    this.completedResearches = [];
    this.nextLabId = 1;
    
    this.initializeResearches();
    this.saveToStorage();
  }
}