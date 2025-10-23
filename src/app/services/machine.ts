import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Machine } from '../models/game.model';
import { SaveService } from './save.service';
import { PlayerStatsService } from './player-stats.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MachineService {

  private machines: Machine[] = [];
  private machinesSubject = new BehaviorSubject<Machine[]>(this.machines);
  private nextMachineId = 1;

  // Types de machines disponibles à l'achat
  private machineTypes = {
    mine: { name: 'Mine', cost: 500, icon: '🏔️' },
    furnace: { name: 'Four', cost: 800, icon: '🔥' },
    assembler: { name: 'Assembleur', cost: 1200, icon: '⚙️' }
  };

  constructor(
    private saveService: SaveService,
    private playerStatsService: PlayerStatsService,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
    if (user) {
      this.loadFromStorage();
    } else {
      this.machines = [];
      this.machinesSubject.next([]);
    }
  });
  }

  // Observable pour les changements
  getMachines$(): Observable<Machine[]> {
    return this.machinesSubject.asObservable();
  }

  // Obtenir toutes les machines
  getMachines(): Machine[] {
    return [...this.machines];
  }

  // Obtenir les machines par type
  getMachinesByType(type: 'mine' | 'furnace' | 'assembler'): Machine[] {
    return this.machines.filter(m => m.type === type);
  }

  // Obtenir une machine par ID
  getMachine(id: string): Machine | undefined {
    return this.machines.find(m => m.id === id);
  }

  // Acheter une nouvelle machine
  buyMachine(type: 'mine' | 'furnace' | 'assembler'): Machine {
    const machineInfo = this.machineTypes[type];
    const machine: Machine = {
      id: `${type}_${this.nextMachineId++}`,
      type: type,
      name: `${machineInfo.name} #${this.nextMachineId - 1}`,
      cost: machineInfo.cost,
      lastProductionTime: Date.now(),
      pauseProgress: 0,
      isActive: false
    };

    this.machines.push(machine);
    this.saveToStorage();
    this.machinesSubject.next([...this.machines]);
    this.playerStatsService.trackMachineBought();
    
    return machine;
  }

  // Configurer la recette d'une machine
  setMachineRecipe(machineId: string, recipeId: string): boolean {
    const machine = this.getMachine(machineId);
    if (!machine) return false;

    machine.selectedRecipeId = recipeId;
    machine.isActive = true;
    machine.lastProductionTime = Date.now();
    
    this.saveToStorage();
    this.machinesSubject.next([...this.machines]);
    return true;
  }

  // Activer/désactiver une machine
  toggleMachine(machineId: string, currentProgress: number = 0): boolean {
    const machine = this.getMachine(machineId);
    if (!machine || !machine.selectedRecipeId) return false;

    if (machine.isActive) {
      // On met en pause : on sauvegarde le progrès actuel
      machine.pauseProgress = currentProgress;
      machine.isActive = false;
    } else {
      // On remet en route : on ajuste le temps de démarrage
      const now = Date.now();
      machine.lastProductionTime = now - (machine.pauseProgress * 1000);
      machine.isActive = true;
    }
    
    this.saveToStorage();
    this.machinesSubject.next([...this.machines]);
    return true;
  }

  // Mettre à jour le temps de dernière production
  updateMachineProductionTime(machineId: string): void {
    const machine = this.getMachine(machineId);
    if (machine) {
      machine.lastProductionTime = Date.now();
      this.saveToStorage();
    }
  }

  // Obtenir le coût d'un type de machine
  getMachineCost(type: 'mine' | 'furnace' | 'assembler'): number {
    return this.machineTypes[type].cost;
  }

  // Obtenir les infos d'un type de machine
  getMachineTypeInfo(type: 'mine' | 'furnace' | 'assembler') {
    return this.machineTypes[type];
  }

  // Obtenir toutes les machines actives
  getActiveMachines(): Machine[] {
    return this.machines.filter(m => m.isActive && m.selectedRecipeId);
  }

  // Supprimer une machine (optionnel)
  deleteMachine(machineId: string): boolean {
    const index = this.machines.findIndex(m => m.id === machineId);
    if (index === -1) return false;

    this.machines.splice(index, 1);
    this.saveToStorage();
    this.machinesSubject.next([...this.machines]);
    return true;
  }

  // Sauvegarder
  private saveToStorage(): void {
    const dataToSave = {
      machines: this.machines,
      nextMachineId: this.nextMachineId
    };
    this.saveService.save('machines', dataToSave);
  }

  // Charger
  private loadFromStorage(): void {
    const saved = this.saveService.load<any>('machines');
    if (saved) {
      this.machines = saved.machines || [];
      this.nextMachineId = saved.nextMachineId || 1;
      this.machinesSubject.next([...this.machines]);
    }
  }

  // Reset pour debug
  reset(): void {
    this.machines = [];
    this.nextMachineId = 1;
    this.saveToStorage();
    this.machinesSubject.next([...this.machines]);
  }
}