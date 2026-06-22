import { Routes } from '@angular/router';
import { ClientPortalComponent } from './pages/portal/portal.component';
import { AdminDashboardComponent } from './pages/admin/admin.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SchedulerComponent } from './pages/scheduler/scheduler.component';
import { PaymentsComponent } from './pages/payments/payments.component';

export const routes: Routes = [
  { path: '', redirectTo: 'portal', pathMatch: 'full' },
  { path: 'portal', component: ClientPortalComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'scheduler', component: SchedulerComponent },
  { path: 'payments', component: PaymentsComponent },
  { path: '**', redirectTo: 'portal' }
];
