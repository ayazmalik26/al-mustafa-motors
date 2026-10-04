import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layout/public-layout/public-layout.component';

export const routes: Routes = [
  {
    path: 'admin',
    // The whole admin area is a separate lazy chunk (never downloaded by customers).
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage), data: { heroHeader: true } },
      { path: 'inventory', loadComponent: () => import('./features/inventory/inventory.page').then((m) => m.InventoryPage) },
      {
        path: 'inventory/:slug',
        loadComponent: () => import('./features/vehicle-detail/vehicle-detail.page').then((m) => m.VehicleDetailPage),
        data: { hideMobileBar: true },
      },
      { path: 'sell-exchange', loadComponent: () => import('./features/sell-exchange/sell-exchange.page').then((m) => m.SellExchangePage) },
      { path: 'about', loadComponent: () => import('./features/about/about.page').then((m) => m.AboutPage) },
      { path: 'contact', loadComponent: () => import('./features/contact/contact.page').then((m) => m.ContactPage) },
      { path: 'saved', loadComponent: () => import('./features/saved/saved.page').then((m) => m.SavedPage) },
      { path: '**', loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage) },
    ],
  },
];
