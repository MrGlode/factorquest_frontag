import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  
  credentials: LoginRequest = {
    username: '',
    password: ''
  };
  
  errorMessage: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;
  rememberMe: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      this.credentials.username = savedUsername;
      this.rememberMe = true;
    }
  }
  
  onSubmit(): void {
    this.errorMessage = '';
    this.isLoading = true;
    
    // Gérer "Se souvenir de moi"
    if (this.rememberMe) {
      localStorage.setItem('rememberedUsername', this.credentials.username);
    } else {
      localStorage.removeItem('rememberedUsername');
    }

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Login successful:', response);
        
        // Rediriger vers l'URL demandée ou dashboard
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigate([returnUrl]);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Une erreur est survenue';
        console.error('Login error:', error);
      }
    });
  }
  
  // Méthode pour remplir automatiquement avec le compte de test
  fillTestAccount(): void {
    this.credentials.username = 'TestPlayer';
    this.credentials.password = 'test123';
  }

  // Toggle affichage du mot de passe
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}