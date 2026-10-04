import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from '../../core/guards/auth.guards';
import { AdminLayoutComponent } from '../../layout/admin-layout/admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in — Admin',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', title: 'Dashboard — Admin', loadComponent: () => import('./dashboard/dashboard.page').then((m) => m.DashboardPage) },
      { path: 'vehicles', title: 'Vehicles — Admin', loadComponent: () => import('./vehicles/vehicle-list.page').then((m) => m.VehicleListPage) },
      { path: 'vehicles/new', title: 'Add vehicle — Admin', loadComponent: () => import('./vehicles/vehicle-form.page').then((m) => m.VehicleFormPage) },
      { path: 'vehicles/:id/edit', title: 'Edit vehicle — Admin', loadComponent: () => import('./vehicles/vehicle-form.page').then((m) => m.VehicleFormPage) },
      { path: 'enquiries', title: 'Enquiries — Admin', loadComponent: () => import('./enquiries/enquiries.page').then((m) => m.EnquiriesPage) },
      { path: 'sell-requests', title: 'Sell requests — Admin', loadComponent: () => import('./sell-requests/sell-requests.page').then((m) => m.SellRequestsPage) },
      {
        path: 'settings',
        title: 'Settings — Admin',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./settings/settings.page').then((m) => m.SettingsPage),
      },
    ],
  },
];
