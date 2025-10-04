import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterRequest } from '../../models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  
  formData: RegisterRequest = {
    username: '',
    email: '',
    password: ''
  };
  
  confirmPassword: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  onSubmit(): void {
    this.errorMessage = '';
    
    // Validation du mot de passe
    if (this.formData.password !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return;
    }
    
    if (this.formData.password.length < 6) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
      return;
    }
    
    this.isLoading = true;
    
    this.authService.register(this.formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Registration successful:', response);
        
        // Rediriger vers le dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Une erreur est survenue';
        console.error('Registration error:', error);
      }
    });
  }
}