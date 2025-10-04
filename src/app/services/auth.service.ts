import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, LoginRequest, RegisterRequest, AuthResponse, TokenPayload } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  
  // Stockage mocké des utilisateurs (en prod, ce serait en base de données)
  private mockUsers: Map<string, { user: User; passwordHash: string }> = new Map();
  
  constructor() {
    // Récupérer l'utilisateur depuis le localStorage au démarrage
    const storedUser = localStorage.getItem('currentUser');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    this.currentUserSubject = new BehaviorSubject<User | null>(user);
    this.currentUser$ = this.currentUserSubject.asObservable();
    
    // Initialiser avec un utilisateur de test
    this.initMockUsers();
  }
  
  // Initialiser des utilisateurs de test
  private initMockUsers(): void {
    const testUser: User = {
      id: '1',
      username: 'TestPlayer',
      email: 'test@factoquest.com',
      createdAt: new Date('2025-01-01'),
      lastLogin: new Date()
    };
    
    this.mockUsers.set('test@factoquest.com', {
      user: testUser,
      passwordHash: 'test123' // En prod, ce serait un vrai hash bcrypt
    });
  }
  
  // Obtenir l'utilisateur courant
  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }
  
  // Vérifier si l'utilisateur est connecté
  public isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    // Vérifier si le token n'est pas expiré
    return !this.isTokenExpired(token);
  }
  
  // Login (mocké)
  public login(credentials: LoginRequest): Observable<AuthResponse> {
    // Simuler un délai réseau et retourner une réponse
    return new Observable<AuthResponse>(observer => {
      setTimeout(() => {
        const userRecord = this.mockUsers.get(credentials.email);
        
        if (!userRecord) {
          observer.error(new Error('Email ou mot de passe incorrect'));
          return;
        }
        
        if (userRecord.passwordHash !== credentials.password) {
          observer.error(new Error('Email ou mot de passe incorrect'));
          return;
        }
        
        // Mise à jour du lastLogin
        userRecord.user.lastLogin = new Date();
        
        // Générer un token JWT mocké
        const token = this.generateMockToken(userRecord.user);
        
        // Stocker l'utilisateur et le token
        localStorage.setItem('currentUser', JSON.stringify(userRecord.user));
        localStorage.setItem('authToken', token);
        
        this.currentUserSubject.next(userRecord.user);
        
        const response: AuthResponse = {
          user: userRecord.user,
          token: token,
          expiresIn: 86400 // 24h en secondes
        };
        
        console.log('✅ Login réussi:', userRecord.user.username);
        
        observer.next(response);
        observer.complete();
      }, 500); // Délai de 500ms pour simuler le réseau
    });
  }
  
  // Register (mocké)
  public register(request: RegisterRequest): Observable<AuthResponse> {
    return new Observable<AuthResponse>(observer => {
      setTimeout(() => {
        // Vérifier si l'email existe déjà
        if (this.mockUsers.has(request.email)) {
          observer.error(new Error('Cet email est déjà utilisé'));
          return;
        }
        
        // Créer le nouvel utilisateur
        const newUser: User = {
          id: Date.now().toString(),
          username: request.username,
          email: request.email,
          createdAt: new Date(),
          lastLogin: new Date()
        };
        
        // Stocker l'utilisateur
        this.mockUsers.set(request.email, {
          user: newUser,
          passwordHash: request.password // En prod, hash avec bcrypt
        });
        
        // Générer un token
        const token = this.generateMockToken(newUser);
        
        // Stocker dans localStorage
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        localStorage.setItem('authToken', token);
        
        this.currentUserSubject.next(newUser);
        
        const response: AuthResponse = {
          user: newUser,
          token: token,
          expiresIn: 86400
        };
        
        console.log('✅ Compte créé:', newUser.username);
        
        observer.next(response);
        observer.complete();
      }, 500); // Délai de 500ms pour simuler le réseau
    });
  }
  
  // Logout
  public logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    this.currentUserSubject.next(null);
    console.log('👋 Déconnexion');
  }
  
  // Obtenir le token
  public getToken(): string | null {
    return localStorage.getItem('authToken');
  }
  
  // Générer un token JWT mocké (en prod, le backend le fait)
  private generateMockToken(user: User): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 86400, // Expire dans 24h
      iat: Math.floor(Date.now() / 1000)
    };
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';
    
    return `${header}.${encodedPayload}.${signature}`;
  }
  
  // Vérifier si le token est expiré
  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  }
  
  // Décoder le token
  private decodeToken(token: string): TokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token');
    }
    
    const payload = JSON.parse(atob(parts[1]));
    return payload as TokenPayload;
  }
}