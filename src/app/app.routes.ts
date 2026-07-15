import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Currency Exchange Rate Dashboard',
  },
];
