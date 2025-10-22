import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, throwError, of } from "rxjs";
import { catchError, map, tap, switchMap } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { Inventory } from "../models/game.model"
import { InventoryResponse, UpdateInventoryRequest } from "../models/game-api.model";
import { AuthService } from "./auth.service";

@Injectable({
    providedIn: "root",
})
export class InventoryApiService {
    private readonly API_URL = `${environment.apiGameUrl}`;

    private inventory: Inventory = {}
    private inventorySubject = new BehaviorSubject<Inventory>(this.inventory);
    private isInitialized = false;

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) {
        this.authService.currentUser$.subscribe((user) => {
            if (user) {
                this.initializeInventory();
            } else {
                this.reset();
            }
        });
    }


    private initializeInventory(): void {
        console.log("initialisation de l'inventaire à partir de l'API");

        this.loadInventoryFromApi().subscribe({
            next: (inventory) => {
                this.inventory = inventory;
                this.inventorySubject.next({ ...this.inventory });
                this.isInitialized = true;
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

    private updateResourceOnApi(resourceId: string, quantity: number, operation: 'add' | 'remove' | 'set'): Observable<Inventory> {
        const request: UpdateInventoryRequest = {
            resourceId,
            quantity,
            operation
        };
        return this.http.put<InventoryResponse>(`${this.API_URL}/inventory`, request).pipe(
            tap((response) => console.log("Ressource mise à jour sur l'API", response)),
            map((response) => response.items),
            tap(() => console.log("Ressource mise à jour sur l'API", request)),
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
        return this.inventory[resourceId] || 0;
    }

    hasResource(resourceId: string, quantity: number): boolean {
        return this.getResourceQuantity(resourceId) >= quantity;
    }

    hasResources(requirements: { resourceId: string; quantity: number; }[]): boolean {
        return requirements.every(req => this.hasResource(req.resourceId, req.quantity));
    }

    addResource(resourceId: string, quantity: number): void {
        if (quantity <= 0) return;

        this.inventory[resourceId] = (this.inventory[resourceId] || 0) + quantity;
        this.inventorySubject.next({ ...this.inventory });

        this.updateResourceOnApi(resourceId, quantity, 'add').subscribe({
            next: (updatedInventory) => {
                this.inventory = updatedInventory;
                this.inventorySubject.next({ ...this.inventory });
            },
            error: (error) => {
                console.error("Erreur lors de l'ajout de la ressource sur l'API", error);
                this.inventory[resourceId] -= quantity;
                if (this.inventory[resourceId] <= 0) {
                    delete this.inventory[resourceId];
                }
                this.inventorySubject.next({ ...this.inventory });
            }
        });
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

        this.updateResourceOnApi(resourceId, quantity, 'remove').subscribe({
            next: (updatedInventory) => {
                this.inventory = updatedInventory;
                this.inventorySubject.next({ ...this.inventory });
            },
            error: (error) => {
                console.error("Erreur lors de la suppression de la ressource sur l'API", error);
                this.inventory[resourceId] = previousQuantity;
                this.inventorySubject.next({ ...this.inventory });
            }
        });

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
        this.updateResourceOnApi(resourceId, quantity, 'set').subscribe({
            next: (updatedInventory) => {
                this.inventory = updatedInventory;
                this.inventorySubject.next({ ...this.inventory });
            },
            error: (error) => {
                console.error("Erreur lors de la mise à jour de la ressource sur l'API", error);
                this.loadInventoryFromApi().subscribe({});
            }
        });
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
        this.inventory = {};
        this.inventorySubject.next({ ...this.inventory });
        this.isInitialized = false;
    }

    syncWithApi(): Observable<Inventory> {
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
}