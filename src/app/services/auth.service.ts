import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, timer } from 'rxjs';
import { tap, catchError, switchMap, retry } from 'rxjs/operators';
import { User, LoginRequest, RegisterRequest, AuthResponse, TokenPayload, RefreshTokenRequest, ForgetPasswordRequest, ResetPasswordRequest } from '../models/user.model';
import { environment } from '../../environments/environment';
import { ApimAuthService } from './apim-auth.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  
  constructor(
    private http: HttpClient,
    private apimAuthService: ApimAuthService,
    private router: Router
  ) {
    // Récupérer l'utilisateur depuis le localStorage au démarrage
    const storedUser = this.getStoredUser();
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }
    
  public login(credentials: LoginRequest): Observable<AuthResponse> {
    console.log('🔐 Tentative de connexion pour:', credentials.username);
    
    // S'assurer que le token API Manager est disponible
    return this.ensureApimToken().pipe(
      switchMap(() => {
        return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
          tap(response => {
            console.log('✅ Connexion réussie via API Manager');
            this.handleAuthSuccess(response);
          }),
          retry({
            count: 2,
            delay: (error, retryCount) => {
              // Retry uniquement pour les erreurs réseau
              if (error.status === 0) {
                console.warn(`⚠️ Tentative ${retryCount}/2 de reconnexion...`);
                return timer(1000);
              }
              throw error;
            }
          }),
          catchError(error => this.handleAuthError(error, 'connexion'))
        );
      })
    );
  }
  
  // Register (mocké)
  public register(request: RegisterRequest): Observable<AuthResponse> {
    console.log('📝 Tentative d\'inscription pour:', request.username);
    
    // S'assurer que le token API Manager est disponible
    return this.ensureApimToken().pipe(
      switchMap(() => {
        return this.http.post<AuthResponse>(`${this.API_URL}/register`, request).pipe(
          tap(response => {
            console.log('✅ Inscription réussie via API Manager');
            this.handleAuthSuccess(response);
          }),
          retry({
            count: 2,
            delay: (error, retryCount) => {
              // Retry uniquement pour les erreurs réseau
              if (error.status === 0) {
                console.warn(`⚠️ Tentative ${retryCount}/2 de reconnexion...`);
                return timer(1000);
              }
              throw error;
            }
          }),
          catchError(error => this.handleAuthError(error, 'inscription'))
        );
      })
    );
  }

  public refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      console.error('❌ Aucun refresh token disponible');
      return throwError(() => new Error('Aucun refresh token disponible'));
    }
    
    console.log('🔄 Rafraîchissement du token utilisateur...');
    
    const request: RefreshTokenRequest = { refreshToken };
    
    // S'assurer que le token API Manager est disponible
    return this.ensureApimToken().pipe(
      switchMap(() => {
        return this.http.post<AuthResponse>(`${this.API_URL}/refresh`, request).pipe(
          tap(response => {
            console.log('✅ Token utilisateur rafraîchi avec succès');
            this.handleAuthSuccess(response);
          }),
          catchError(error => {
            console.error('❌ Échec du rafraîchissement du token utilisateur');
            // Si le refresh échoue, déconnecter l'utilisateur
            this.logout();
            return this.handleAuthError(error, 'rafraîchissement du token');
          })
        );
      })
    );
  }

  public requestPasswordReset(email: string): Observable<void> {
    console.log('📧 Demande de réinitialisation de mot de passe pour:', email);
    
    const request: ForgetPasswordRequest = { email };
    
    return this.ensureApimToken().pipe(
      switchMap(() => {
        return this.http.post<void>(`${this.API_URL}/forgot-password`, request).pipe(
          tap(() => console.log('✅ Email de réinitialisation envoyé')),
          catchError(error => this.handleAuthError(error, 'réinitialisation de mot de passe'))
        );
      })
    );
  }

  public confirmPasswordReset(token: string, newPassword: string): Observable<void> {
    console.log('🔒 Confirmation de réinitialisation de mot de passe...');
    
    const request: ResetPasswordRequest = { token, newPassword };
    
    return this.ensureApimToken().pipe(
      switchMap(() => {
        return this.http.post<void>(`${this.API_URL}/reset-password`, request).pipe(
          tap(() => console.log('✅ Mot de passe réinitialisé avec succès')),
          catchError(error => this.handleAuthError(error, 'confirmation de réinitialisation'))
        );
      })
    );
  }
  
  public logout(): void {
    console.log('👋 Déconnexion de l\'utilisateur...');
    
    // Supprimer les données du localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // Mettre à jour le BehaviorSubject
    this.currentUserSubject.next(null);
    
    // Rediriger vers la page de login
    this.router.navigate(['/login']);
    
    console.log('✅ Déconnexion réussie');
  }

  public currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    
    // Vérifier si le token n'est pas expiré
    return !this.isTokenExpired(token);
  }

  public getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  public getUserId(): string | null {
    return this.currentUserValue?.id || null;
  }

  public isApimReady(): boolean {
    return this.apimAuthService.hasValidToken();
  }

  private ensureApimToken(): Observable<string> {
    // Si on a déjà un token valide, le retourner
    if (this.apimAuthService.hasValidToken()) {
      return this.apimAuthService.getToken();
    }
    
    // Sinon, en obtenir un nouveau
    console.log('⚠️ Token API Manager non disponible, obtention d\'un nouveau token...');
    return this.apimAuthService.getToken().pipe(
      tap(() => console.log('✅ Token API Manager obtenu')),
      catchError(error => {
        console.error('❌ Impossible d\'obtenir le token API Manager:', error);
        return throwError(() => new Error(
          'Impossible de se connecter au serveur d\'authentification. Veuillez réessayer.'
        ));
      })
    );
  }

  private handleAuthSuccess(response: AuthResponse): void {
    // Stocker les tokens utilisateur
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    
    // Stocker l'utilisateur
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    
    // Mettre à jour le BehaviorSubject
    this.currentUserSubject.next(response.user);
    
    console.log('✅ Authentification utilisateur réussie:', response.user.username);
    console.log(`   • Token utilisateur expire dans ${response.expiresIn}s (${Math.round(response.expiresIn / 60)} minutes)`);
  }

  private handleAuthError(error: HttpErrorResponse, context: string): Observable<never> {
    let errorMessage = `Erreur lors de ${context}`;
    let userMessage = 'Une erreur est survenue';
    
    // Erreurs réseau
    if (error.status === 0) {
      errorMessage = 'Erreur réseau - Impossible de contacter le serveur';
      userMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion Internet.';
      console.error(`❌ ${errorMessage}`);
    }
    // Erreurs API Manager (généralement 401 si token APIM invalide)
    else if (error.status === 401 && !error.url?.includes('/auth/')) {
      errorMessage = 'Token API Manager invalide ou expiré';
      userMessage = 'Erreur d\'authentification serveur. Veuillez rafraîchir la page.';
      console.error(`❌ ${errorMessage} - Rafraîchissement du token APIM recommandé`);
      
      // Tenter de rafraîchir le token API Manager
      this.apimAuthService.refreshToken().subscribe({
        next: () => console.log('✅ Token API Manager rafraîchi automatiquement'),
        error: (err) => console.error('❌ Impossible de rafraîchir le token API Manager:', err)
      });
    }
    // Erreurs d'authentification utilisateur
    else if (error.status === 401) {
      errorMessage = 'Identifiants utilisateur incorrects';
      userMessage = 'Email ou mot de passe incorrect';
      console.error(`❌ ${errorMessage}`);
    }
    // Conflit (email déjà utilisé)
    else if (error.status === 409) {
      errorMessage = 'Conflit - Email déjà utilisé';
      userMessage = 'Cet email est déjà utilisé';
      console.error(`❌ ${errorMessage}`);
    }
    // Données invalides
    else if (error.status === 400) {
      if (error.error?.message) {
        errorMessage = `Données invalides - ${error.error.message}`;
        userMessage = error.error.message;
      } else {
        errorMessage = 'Données invalides';
        userMessage = 'Les données fournies sont invalides';
      }
      console.error(`❌ ${errorMessage}`);
    }
    // Erreur serveur
    else if (error.status >= 500) {
      errorMessage = `Erreur serveur (${error.status})`;
      userMessage = 'Le serveur rencontre des difficultés. Veuillez réessayer plus tard.';
      console.error(`❌ ${errorMessage}`, error);
    }
    // Autres erreurs
    else {
      if (error.error?.message) {
        errorMessage = error.error.message;
        userMessage = error.error.message;
      }
      console.error(`❌ Erreur inattendue lors de ${context}:`, error);
    }
    
    console.error(`   • Status: ${error.status}`);
    console.error(`   • Message: ${errorMessage}`);
    if (error.url) {
      console.error(`   • URL: ${error.url}`);
    }
    
    return throwError(() => new Error(userMessage));
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < now;
      
      if (isExpired) {
        console.warn('⚠️ Token utilisateur expiré');
      }
      
      return isExpired;
    } catch (error) {
      console.error('❌ Erreur lors du décodage du token:', error);
      return true;
    }
  }

  private decodeToken(token: string): TokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token JWT invalide');
    }
    
    const payload = parts[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  }

  private getStoredUser(): User | null {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) return null;
    
    try {
      return JSON.parse(storedUser);
    } catch (error) {
      console.error('❌ Erreur lors de la lecture de l\'utilisateur stocké:', error);
      return null;
    }
  }
}