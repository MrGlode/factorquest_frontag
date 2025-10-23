import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, throwError, of } from "rxjs";
import { tap, catchError, map, switchMap } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { Machine } from "../models/game.model";
import { MachineResponse, PurchaseMachineRequest, UpdateMachineRequest, MachineProductionRequest, MachineProductionResponse } from "../models/game-api.model";
import { AuthService } from "./auth.service";
import { PlayerStatsService } from "./player-stats.service";

@Injectable({
    providedIn: "root",
})
export class MachineApiService {
    private apiUrl = environment.apiGameUrl;

    private machines: Machine[] = [];
    private machinesSubject = new BehaviorSubject<Machine[]>(this.machines);
    private isInitialized = false;

    private machineTypes = {
        mine: { name: 'Mine', cost: 500, icon: '⛏️' },
        furnace: { name: 'Four', cost: 800, icon: '🔥' },
        assembler: { name: 'Assembleur', cost: 1200, icon: '⚙️' }
    };

    constructor(
        private http: HttpClient,
        private authService: AuthService,
        private playerStatsService: PlayerStatsService
    ) {
        this.authService.currentUser$.subscribe(user => {
            if (user) {
                this.initializeMachines();
            } else {
                this.reset();
            }
        });
    }

    private initializeMachines(): void {
        console.log("Initialisation des machines depuis l'API");

        this.loadMachinesFromApi().subscribe({
            next: (machines) => {
                this.machines = machines;
                this.machinesSubject.next(this.machines);
                this.isInitialized = true;
                console.log("Machines initialisées :", this.machines);
            },
            error: (error) => {
                console.error("Erreur lors du chargement des machines :", error);
                this.machines = [];
                this.machinesSubject.next([]);
            }
        });
    }

    private loadMachinesFromApi(): Observable<Machine[]> {
        return this.http.get<MachineResponse[]>(`${this.apiUrl}/machines`).pipe(
            map(responses => responses.map(r => this.mapResponseToMachine(r))),
            catchError(error => {
                if (error.status === 404) {
                    console.warn("Aucune machine trouvée pour l'utilisateur.");
                    return of([]);
                }
                return throwError(() => error);
            })
        );
    }

    private purchaseMachineFromApi(type: 'mine' | 'furnace' | 'assembler'): Observable<Machine> {
        const request: PurchaseMachineRequest = { type };
        return this.http.post<MachineResponse>(`${this.apiUrl}/machines`, request).pipe(
            map(response => this.mapResponseToMachine(response)),
            tap((machine) => console.log("Machine achetée via l'API :", machine))
        );
    }

    private updateMachineOnApi(machineId: string, update: UpdateMachineRequest): Observable<Machine> {
        return this.http.put<MachineResponse>(`${this.apiUrl}/machines/${machineId}`, update).pipe(
            map(response => this.mapResponseToMachine(response)),
            tap((machine) => console.log("Machine mise à jour via l'API :", machine))
        );
    }

    private deleteMachineOnApi(machineId: string): Observable<boolean> {
        return this.http.delete<{ success: boolean }>(`${this.apiUrl}/machines/${machineId}`).pipe(
            map(response => response.success),
            tap((success) => {
                if (success) {
                    console.log(`Machine ${machineId} supprimée via l'API`);
                }
            })
        );
    }

    private produceOnApi(machineId: string, recipeId: string): Observable<MachineProductionResponse> {
        const request: MachineProductionRequest = { recipeId };

        return this.http.post<MachineProductionResponse>(`${this.apiUrl}/machines/${machineId}/produce`, request).pipe(
            tap((response) => console.log(`Production lancée sur la machine ${machineId} via l'API :`, response))
        );
    }

    getMachines$(): Observable<Machine[]> {
        return this.machinesSubject.asObservable();
    }

    getMachines(): Machine[] {
        return [...this.machines];
    }

    getMachinesByType(type: 'mine' | 'furnace' | 'assembler'): Machine[] {
        return this.machines.filter(machine => machine.type === type);
    }

    getMachine(id: string): Machine | undefined {
        return this.machines.find(machine => machine.id === id);
    }

    getActiveMachines(): Machine[] {
        return this.machines.filter(machine => machine.isActive && machine.selectedRecipeId);
    }

    getMachineCost(type: 'mine' | 'furnace' | 'assembler'): number {
        return this.machineTypes[type].cost;
    }

    getMachineTypeInfo(type: 'mine' | 'furnace' | 'assembler') {
        return this.machineTypes[type];
    }

    buyMachine(type: 'mine' | 'furnace' | 'assembler'): Observable<Machine> {
        console.log(`Achat d'une machine de type ${type}`);

        return this.purchaseMachineFromApi(type).pipe(
            tap((machine) => {
                this.machines.push(machine);
                this.machinesSubject.next([...this.machines]);
                this.playerStatsService.trackMachineBought();
            }),
            catchError(error => {
                console.error("Erreur lors de l'achat de la machine :", error);
                return throwError(() => error);
            })
        );
    }

    setMachineRecipe(machineId: string, recipeId: string): Observable<boolean> {
        const machine = this.getMachine(machineId);
        if (!machine) {
            console.warn("Machine non trouvée");
            return of(false);
        }

        const update: UpdateMachineRequest = { selectedRecipeId: recipeId, isActive: true, lastProductionTime: Date.now(), pauseProgress: 0 };

        return this.updateMachineOnApi(machineId, update).pipe(
            map((updatedMachine) => {
                    const index = this.machines.findIndex(m => m.id === machineId);
                if (index !== -1) {
                    this.machines[index] = updatedMachine;
                    this.machinesSubject.next([...this.machines]);
                }
                return true;
            }),
            catchError(error => {
                console.error("Erreur lors de la mise à jour de la machine :", error);
                return of(false);
            })
        );
    }

    toggleMachine(machineId: string, currentProgress: number = 0): Observable<boolean> {
        const machine = this.getMachine(machineId);
        if (!machine || !machine.selectedRecipeId) {
            console.warn("Machine non trouvée ou recette non sélectionnée");
            return of(false);
        }

        let update: UpdateMachineRequest;

        if (machine.isActive) {
            update = { 
                isActive: false,
                pauseProgress: currentProgress,
                lastProductionTime: Date.now(),
                selectedRecipeId: machine.selectedRecipeId

            };
        } else {
            const now = Date.now();
            const adjustedTime = now - (machine.pauseProgress * 1000);

            update = {
                isActive: true,
                lastProductionTime: adjustedTime,
                pauseProgress: 0,
                selectedRecipeId: machine.selectedRecipeId
            };
        }

        return this.updateMachineOnApi(machineId, update).pipe(
            map((updatedMachine) => {
                const index = this.machines.findIndex(m => m.id === machineId);
                if (index !== -1) {
                    this.machines[index] = updatedMachine;
                    this.machinesSubject.next([...this.machines]);
                }
                return true;
            }),
            catchError(error => {
                console.error("Erreur lors de la mise à jour de la machine :", error);
                return of(false);
            })
        );
    }

    updateMachineProductionTime(machineId: string): Observable<boolean> {
        const machine = this.getMachine(machineId);
        if (!machine) {
            console.warn("Machine non trouvée");
            return of(false);
        }

        const update: UpdateMachineRequest = {
            lastProductionTime: Date.now(),
            pauseProgress: 0,
            isActive: machine.isActive,
            selectedRecipeId: machine.selectedRecipeId
        };

        return this.updateMachineOnApi(machineId, update).pipe(
            map((updatedMachine) => {
                const index = this.machines.findIndex(m => m.id === machineId);
                if (index !== -1) {
                    this.machines[index] = updatedMachine;
                    this.machinesSubject.next([...this.machines]);
                }
                return true;
            }),
            catchError(error => {
                console.error("Erreur lors de la mise à jour de la machine :", error);
                return of(false);
            })
        );
    }

    deleteMachine(machineId: string): Observable<boolean> {
        return this.deleteMachineOnApi(machineId).pipe(
            tap(success => {
                if (success) {
                    const index = this.machines.findIndex(m => m.id === machineId);
                    if (index !== -1) {
                        this.machines.splice(index, 1);
                        this.machinesSubject.next([...this.machines]);
                    }
                }
            }),
            catchError(error => {
                console.error("Erreur lors de la suppression de la machine :", error);
                return of(false);
            })
        );
    }

    produceMachine(machineId: string, recipeId: string): Observable<MachineProductionResponse> {
        return this.produceOnApi(machineId, recipeId).pipe(
            tap(response => {
                if (response.success) {
                    this.updateMachineProductionTime(machineId).subscribe();
                }
            }),
            catchError(error => {
                console.error("Erreur lors de la production de la machine :", error);
                return throwError(() => error);
            })
        );
    }

    reset(): void {
        this.machines = [];
        this.machinesSubject.next([]);
        this.isInitialized = false;
    }

    syncWithApi(): Observable<Machine[]> {
        console.log("Synchronisation des machines avec l'API");
        return this.loadMachinesFromApi().pipe(
            tap((machines) => {
                this.machines = machines;
                this.machinesSubject.next([...this.machines]);
            })
        );
    }

    private mapResponseToMachine(response: MachineResponse): Machine {
        return {
            id: response.id,
            type: response.type,
            name: response.name,
            cost: response.cost,
            selectedRecipeId: response.selectedRecipeId,
            lastProductionTime: response.lastProductionTime,
            pauseProgress: response.pauseProgress,
            isActive: response.isActive
        };
    }
}