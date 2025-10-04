import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guards';

import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { Dashboard } from './pages/dashboard/dashboard';
import { Mines } from './pages/mines/mines';
import { Furnaces } from './pages/furnaces/furnaces';
import { Assemblers } from './pages/assemblers/assemblers';
import { Market } from './pages/market/market';
import { ResearchComponent } from './pages/research/research';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },

  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'mines', component: Mines },
      { path: 'furnaces', component: Furnaces },
      { path: 'assemblers', component: Assemblers },
      { path: 'market', component: Market },
      { path: 'research', component: ResearchComponent },
      { path: '**', redirectTo: '/dashboard' } // Fallback
    ]
  },
  { path: '**', redirectTo: '/login' } // Fallback for unauthenticated routes
];