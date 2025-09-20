import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';
import { Mines } from './pages/mines/mines';
import { Furnaces } from './pages/furnaces/furnaces';
import { Assemblers } from './pages/assemblers/assemblers';
import { Market } from './pages/market/market';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'mines', component: Mines },
  { path: 'furnaces', component: Furnaces },
  { path: 'assemblers', component: Assemblers },
  { path: 'market', component: Market },
  { path: '**', redirectTo: '/dashboard' } // Fallback
];