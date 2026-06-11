import { Routes } from '@angular/router';
import { ClientPortalComponent } from './pages/portal/portal.component';
import { AdminDashboardComponent } from './pages/admin/admin.component';

export const routes: Routes = [
  { path: '', redirectTo: 'portal', pathMatch: 'full' },
  { path: 'portal', component: ClientPortalComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: '**', redirectTo: 'portal' }
];
