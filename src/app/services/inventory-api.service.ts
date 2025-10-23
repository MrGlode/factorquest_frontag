import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, throwError, of } from "rxjs";
import { catchError, map, tap, switchMap } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { Inventory } from "../models/game.model"
import { BatchUpdateInventoryRequest, InventoryResponse, UpdateInventoryRequest } from "../models/game-api.model";
import { AuthService } from "./auth.service";

interface PendingUpdate {
    resourceId: string;
    delta: number;
}

@Injectable({
    providedIn: "root",
})
export class InventoryApiService {
    private readonly API_URL = `${environment.apiGameUrl}`;

    private inventory: Inventory = {}
    private inventorySubject = new BehaviorSubject<Inventory>(this.inventory);
    private isInitialized = false;
    private isInitializedSubject = new BehaviorSubject<boolean>(false);

    private pendingUpdates: Map<string, number> = new Map();
    private batchInterval: any;
    private readonly BATCH_DELAY = 5000; // 5 secondes

    constructor(
        private http: HttpClient,
        private authService: AuthService
        
    ) {
        console.log('📦 InventoryApiService créé');
        this.authService.currentUser$.subscribe((user) => {
            if (user) {
                this.initializeInventory();
                this.startBatchInterval();
            } else {
                this.reset();
            }
        });
    }

    private startBatchInterval(): void {
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
        }

        console.log("Démarrage de l'intervalle de mise à jour par lot de l'inventaire");

        this.batchInterval = setInterval(() => {
            this.flushPendingUpdates();
        }, this.BATCH_DELAY);
    }

    private stopBatchInterval(): void {
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
            this.batchInterval = null;
            console.log("Arrêt de l'intervalle de mise à jour par lot de l'inventaire");
        }
    }

    private flushPendingUpdates(): void {
        if (this.pendingUpdates.size === 0) {
            return;
        }

        console.log("Envoi des mises à jour en lot de l'inventaire vers l'API", this.pendingUpdates.size);

        const updates = new Map(this.pendingUpdates);
        this.pendingUpdates.clear();

        this.batchUpdateInventory(updates).subscribe({
            next:() => {
                console.log("Mises à jour en lot de l'inventaire envoyées avec succès");
            },
            error: (error) => {
                console.error("Erreur lors de l'envoi des mises à jour en lot de l'inventaire", error);
                updates.forEach((delta, resourceId) => {
                    const currentDelta = this.pendingUpdates.get(resourceId) || 0;
                    this.pendingUpdates.set(resourceId, currentDelta + delta);
                });
            }
        });
    }

    private batchUpdateInventory(updates: Map<string, number>): Observable<void> {
        const requests: Observable<any>[] = [];
        const batchUpdates: any[] = [];
        updates.forEach((delta, resourceId) => {
            if(delta !== 0) {
                const operation = delta > 0 ? 'add' : 'remove';
                const quantity = Math.abs(delta);
                

                batchUpdates.push({ resourceId, quantity, operation });
            }
        });

        if (batchUpdates.length === 0) {
            return of(void 0);
        }

        return this.updateResourceOnApi(null, null, null, batchUpdates).pipe(
            map(() => void 0),
            catchError((error) => {
                return throwError(() => error);
            })
        );
    }


    private initializeInventory(): void {
        console.log("initialisation de l'inventaire à partir de l'API");

        this.loadInventoryFromApi().subscribe({
            next: (inventory) => {
                this.inventory = inventory;
                this.inventorySubject.next({ ...this.inventory });
                this.isInitialized = true;
                this.isInitializedSubject.next(true);
                console.log("inventaire initialisé", inventory);
            },
            error: (error) => {
                console.error("Erreur lors du chargement de l'inventaire depuis l'API", error);
                this.createDefaultInventory().subscribe();
            }
        });
    }

    private loadInventoryFromApi(): Observable<Inventory> {
        return this.http.get<InventoryResponse>(`${this.API_URL}/inventory`).pipe(
            map(response => {
                if (response.items && typeof response.items === 'object' && !Array.isArray(response.items)) {
                    return response.items;
                }

                if (Array.isArray(response.items)) {
                    const inventory: Inventory = {};
                    response.items.forEach((item: any) => {
                        if (item.resourceId && item.quantity !== undefined) {
                            inventory[item.resourceId] = item.quantity;
                        }
                    });
                    return inventory;
                }

                console.warn("Format inattendu des items de l'inventaire reçu de l'API", response.items);
                return {};
            }),
            catchError((error) => {
                if (error.status === 404) {
                    console.log("Aucun inventaire trouvé, création d'un inventaire par défaut");
                    return this.createDefaultInventory();
                }
                return throwError(() => error);
            })
        );
    }

    private createDefaultInventory(): Observable<Inventory> {
        return this.http.post<InventoryResponse>(`${this.API_URL}/inventory`, {}).pipe(
            map((response) => response.items),
            tap(() => console.log("Inventaire par défaut créé")),
        );
    }

    private updateResourceOnApi(resourceId: string | null, quantity: number | null, operation: 'add' | 'remove' | 'set' | null, batchUpdates?: { resourceId: string; quantity: number; operation: 'add' | 'remove' | 'set' }[]): Observable<Inventory> {
        
        let body: any;
        let endpoint = `${this.API_URL}/inventory`;

        // Mode batch : envoyer un tableau de mises à jour
        if (batchUpdates && batchUpdates.length > 0) {
            const inventoryItems: { resourceId: string; quantity: number}[] = [];

            batchUpdates.forEach(update => {
                let finalQuantity = update.quantity;
                const currentQuantity = this.inventory[update.resourceId] || 0;
                if (update.operation === 'add') {
                    finalQuantity = currentQuantity + update.quantity;
                } else if (update.operation === 'remove') {
                    finalQuantity = Math.max(0, currentQuantity - update.quantity);
                } else if (update.operation === 'set') {
                    finalQuantity = update.quantity;
                }
                inventoryItems.push({ resourceId: update.resourceId, quantity: finalQuantity });
            });

            body = inventoryItems;

            console.log(`📤 Batch API call: ${batchUpdates.length} mises à jour`);
        } 
        // Mode single : une seule mise à jour
        else if (resourceId && quantity !== null && operation) {
            body = { resourceId, quantity, operation };
            console.log(`📤 Single API call: ${resourceId} ${operation} ${quantity}`);
        } 
        else {
            console.error('❌ Paramètres invalides pour updateResourceOnApi');
            return of({});
        }

        return this.http.put<InventoryResponse | any>(endpoint, body).pipe(
            map(response => {
                // Gérer les différents formats de réponse
                if (response && response.resources && typeof response.resources === 'object' && !Array.isArray(response.resources)) {
                    return response.resources;
                }
                
                if (Array.isArray(response)) {
                    const inventory: Inventory = {};
                    response.forEach((item: any) => {
                    if (item.resourceId && item.quantity !== undefined) {
                        inventory[item.resourceId] = item.quantity;
                    }
                    });
                    return inventory;
                }
                
                if (response && response.resources && Array.isArray(response.resources)) {
                    const inventory: Inventory = {};
                    response.resources.forEach((item: any) => {
                    if (item.resourceId && item.quantity !== undefined) {
                        inventory[item.resourceId] = item.quantity;
                    }
                    });
                    return inventory;
                }
                
                // Si le backend retourne juste 200 OK sans body
                return {};
            }),
            tap((inventory) => {
                if (batchUpdates) {
                    console.log(`💾 Batch de ${batchUpdates.length} ressources synchronisé`);
                } else if (resourceId) {
                    console.log(`💾 Ressource ${resourceId} mise à jour`);
                }
            })
        );
    }

    private consumeResourceOnApi(resources: { resourceId: string; quantity: number; }[]): Observable<boolean> {
        if (resources.length === 0) {
            return of(true);
        }

        let result$ = of(true);

        resources.forEach((res) => {
            result$ = result$.pipe(
                switchMap((success) => {
                    if (!success) {
                        return of(false);
                    }

                    return this.updateResourceOnApi(res.resourceId, res.quantity, 'remove').pipe(
                        map(() => true),
                        catchError(() => of(false))
                    );
                })
            );
        });

        return result$.pipe(
            tap((success) => {
                if (success) {
                    console.log("Ressources consommées sur l'API", resources);
                } else {
                    console.error("Échec de la consommation des ressources sur l'API", resources);
                }
            })
        );
    }

    getInventory$(): Observable<Inventory> {
        return this.inventorySubject.asObservable();
    }

    getInventory(): Inventory {
        return { ...this.inventory };
    }

    getResourceQuantity(resourceId: string): number {
        if(!this.inventory || typeof this.inventory !== 'object') {
            console.log("Inventaire non initialisé ou invalide");
            return 0;
        }

        return this.inventory[resourceId] || 0;
    }

    hasResource(resourceId: string, quantity: number): boolean {
        if (!this.inventory || typeof this.inventory !== 'object') {
            return false;
        }
        return this.getResourceQuantity(resourceId) >= quantity;
    }

    hasResources(requirements: { resourceId: string; quantity: number; }[]): boolean {
        if (!this.inventory || typeof this.inventory !== 'object') {
            return false;
        }
        return requirements.every(req => this.hasResource(req.resourceId, req.quantity));
    }

    addResource(resourceId: string, quantity: number): void {
        if (quantity <= 0) return;

        if (!this.inventory || typeof this.inventory !== 'object') {
            console.log("Inventaire non initialisé ou invalide, initialisation vide");
            return;
        }

        this.inventory[resourceId] = (this.inventory[resourceId] || 0) + quantity;
        this.inventorySubject.next({ ...this.inventory });

        const currentDelta = this.pendingUpdates.get(resourceId) || 0;
        this.pendingUpdates.set(resourceId, currentDelta + quantity);
    }

    removeResource(resourceId: string, quantity: number): boolean {
        if (quantity <= 0) return true;
        if (!this.hasResource(resourceId, quantity)) {
            console.error("Ressource insuffisante pour la suppression", { resourceId, quantity });
            return false;
        }

        const previousQuantity = this.inventory[resourceId];
        this.inventory[resourceId] -= quantity;
        if (this.inventory[resourceId] <= 0) {
            delete this.inventory[resourceId];
        }
        this.inventorySubject.next({ ...this.inventory });

        const currentDelta = this.pendingUpdates.get(resourceId) || 0;
        this.pendingUpdates.set(resourceId, currentDelta - quantity);

        return true;
    }

    setResource(resourceId: string, quantity: number): void {
        if (quantity < 0) return;

        if (quantity === 0) {
            delete this.inventory[resourceId];
        } else {
            this.inventory[resourceId] = quantity;
        }
        this.inventorySubject.next({ ...this.inventory });
        
        this.pendingUpdates.set(resourceId, quantity);
        this.flushPendingUpdates();
    }

    consumeResources(resources: { resourceId: string; quantity: number; }[]): Observable<boolean> {
        if (!this.hasResources(resources)) {
            console.error("Ressources insuffisantes pour la consommation", resources);
            return of(false);
        }
        
        const previousInventory = { ...this.inventory };
        resources.forEach((res) => {
            this.inventory[res.resourceId] = (this.inventory[res.resourceId] || 0) - res.quantity;
            if (this.inventory[res.resourceId] <= 0) {
                delete this.inventory[res.resourceId];
            }
        });
        this.inventorySubject.next({ ...this.inventory });

        return this.consumeResourceOnApi(resources).pipe(
            tap((success) => {
                if (success) {
                    this.loadInventoryFromApi().subscribe({
                        next: (updatedInventory) => {
                            this.inventory = updatedInventory;
                            this.inventorySubject.next({ ...this.inventory });
                        }
                    });
                } else {
                    console.error("Restauration de l'inventaire précédent après échec de la consommation");
                    this.inventory = previousInventory;
                    this.inventorySubject.next({ ...this.inventory });
                }
            }),
            catchError((error) => {
                console.error("Erreur lors de la consommation des ressources sur l'API", error);
                this.inventory = previousInventory;
                this.inventorySubject.next({ ...this.inventory });
                return of(false);
            })
        );
    }

    reset(): void {
        console.log('🔄 Reset de l\'inventaire...');
        this.stopBatchInterval();
        this.pendingUpdates.clear();
        this.inventory = {};
        this.inventorySubject.next({});
        this.isInitialized = false;
        this.isInitializedSubject.next(false);
    }

    syncWithApi(): Observable<Inventory> {
        this.flushPendingUpdates();
        console.log("synchronisation de l'inventaire avec l'API");
        return this.loadInventoryFromApi().pipe(
            tap((inventory) => {
                this.inventory = inventory;
                this.inventorySubject.next({ ...this.inventory });
                console.log("inventaire synchronisé", inventory);
            })
        );
    }

    getTotalItems(): number {
        return Object.values(this.inventory).reduce((total, qty) => total + qty, 0);
    }

    getResourceTypesCount(): number {
        return Object.keys(this.inventory).length;
    }

    isInventoryReady(): boolean {
        return this.isInitialized && this.inventory !== null;
    }

    isReady$(): Observable<boolean> {
       return this.isInitializedSubject.asObservable();
    }

    forceSyncNow(): Observable<void> {
        this.flushPendingUpdates();
        return of(void 0);
    }
}