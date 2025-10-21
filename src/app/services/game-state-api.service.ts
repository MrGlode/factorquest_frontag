import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { GameState } from '../models/game.model';
import { GlobalGameStateResponse, GameStateResponse, UpdateGameStateRequest, OfflineProgressResponse, ApiResponse } from '../models/game-api.model';
import { AuthService } from './auth.service';
import { PlayerStatsService } from './player-stats.service';

@Injectable({
    providedIn: 'root'
})
export class GameStateApiService {
    private readonly API_URL = `${environment.apiGameUrl}`;
    
    private gameState: GameState = {
        money: 10000,
        lastSaveTime: Date.now(),
        totalPlayTime: 0
    };

    private gameStateSubject = new BehaviorSubject<GameState>(this.gameState);
    private isInitialized = false;

    constructor(
        private http: HttpClient,
        private authService: AuthService,
        private playerStatsService: PlayerStatsService
    ) {
        this.authService.currentUser$.subscribe(user => {
            if (user) {
                this.initializeGameState();
            } else {
                this.reset();
            }
        });
    }

    private initializeGameState(): void {
        console.log('initialisation de l\'état du jeu à partir de l\'API');
        
        this.loadGameStateFromApi().subscribe({
            next: (gameState) => {
                this.gameState = gameState;
                this.gameStateSubject.next({ ...this.gameState });
                this.isInitialized = true;
                console.log('état du jeu initialisé', gameState);

                this.calculateOfflineProgress();
            },
            error: (error) => {
                console.error('Erreur lors du chargement de l\'état du jeu depuis l\'API', error);
                this.createDefaultGameState().subscribe();
            }
        });
    }

    private loadGameStateFromApi(): Observable<GameState> {
        return this.http.get<GlobalGameStateResponse>(`${this.API_URL}/state`).pipe(
            map(response => this.mapResponseToGameState(response)),
            catchError(error => {
                if (error.status === 404) {
                    console.log('Aucun état du jeu trouvé pour l\'utilisateur, création d\'un nouvel état par défaut.');
                    return this.createDefaultGameState();
                }
                return throwError(() => error);
            })
        );
    }

    private createDefaultGameState(): Observable<GameState> {
        const defaultState: UpdateGameStateRequest = {
            money: 10000,
            totalPlayTime: 0
        };

        return this.http.post<GlobalGameStateResponse>(`${this.API_URL}/state`, defaultState).pipe(
            map(response => this.mapResponseToGameState(response)),
            tap(() => console.log('Nouvel état du jeu par défaut créé'))
        );
    }

    private calculateOfflineProgress(): void {
        const offlineTime = this.getOfflineTime();

        if (offlineTime > 60) {
            console.log(`Calcul du progrès hors ligne pour ${offlineTime} secondes`);

            this.http.post<OfflineProgressResponse>(`${this.API_URL}/offline-progress`, { offlineTime }).pipe(
                tap(progress => {
                    console.log('Progrès hors ligne reçu', progress);
                    if (progress.moneyEarned > 0) {
                        this.addMoney(progress.moneyEarned);
                    }
                }),
                catchError(error => {
                    console.error('Erreur lors du calcul du progrès hors ligne', error);
                    return throwError(() => error);
                })
            ).subscribe();
        }
        this.gameState.lastSaveTime = Date.now();
        this.saveGameStateToApi().subscribe();
    }

    private saveGameStateToApi(): Observable<void> {
        const request: UpdateGameStateRequest = {
            money: this.gameState.money,
            totalPlayTime: this.gameState.totalPlayTime
        };

        return this.http.put<GlobalGameStateResponse>(`${this.API_URL}/state`, request).pipe(
            map(response => console.log('État du jeu sauvegardé avec succès', response)),
            tap(() => console.log('État du jeu sauvegardé sur l\'API'))
        );
    }

    private mapResponseToGameState(response: GlobalGameStateResponse): GameState {
        return {
            money: response.state.money,
            lastSaveTime: response.state.lastSavedTime,
            totalPlayTime: response.state.totalPlayTime
        };
    }

    getOfflineTime(): number {
        return Math.max(0, Date.now() - this.gameState.lastSaveTime);
    }

    addMoney(amount: number): void {
        if (amount <= 0) return;

        this.gameState.money += amount;
        this.gameStateSubject.next({ ...this.gameState });

        this.saveGameStateToApi().subscribe({
            error: (error) => console.error('Erreur lors de la sauvegarde de l\'état du jeu après ajout d\'argent', error)
        });

        this.playerStatsService.trackMoneyEarned(amount);
        this.playerStatsService.trackHighestMoney(this.gameState.money);
    }

    getGameState$(): Observable<GameState> {
        return this.gameStateSubject.asObservable();
    }

    getGameState(): GameState {
        return { ...this.gameState };
    }

    getMoney(): number {
        return this.gameState.money;
    }

    spendMoney(amount: number): boolean {
        if (amount <= 0) return true;
        if (this.gameState.money < amount) {
            console.log('Fonds insuffisants pour dépenser', amount);
            return false;
        }

        this.gameState.money -= amount;
        this.gameStateSubject.next({ ...this.gameState });

        this.saveGameStateToApi().subscribe({
            error: (error) => console.error('Erreur lors de la sauvegarde de l\'état du jeu après dépense d\'argent', error)
        });

        this.playerStatsService.trackMoneySpent(amount);
        return true;
    }

    canAfford(amount: number): boolean {
        return this.gameState.money >= amount;
    }

    updatePlayTime(): void {
        const now = Date.now();
        const deltaTime = now - this.gameState.lastSaveTime;
        this.gameState.totalPlayTime += deltaTime;
        this.gameState.lastSaveTime = now;

        if (deltaTime > 300000){
            this.saveGameStateToApi().subscribe();
        }
    }

    reset(): void {
        this.gameState = {
            money: 10000,
            lastSaveTime: Date.now(),
            totalPlayTime: 0
        };
        this.gameStateSubject.next({ ...this.gameState });
        this.isInitialized = false;
    }

    syncWithApi(): Observable<GameState> {
        return this.loadGameStateFromApi().pipe(
            tap((gameState) => {
                this.gameState = gameState;
                this.gameStateSubject.next({ ...this.gameState });
                console.log('État du jeu synchronisé avec l\'API', gameState);
            })
        );
    }
}
