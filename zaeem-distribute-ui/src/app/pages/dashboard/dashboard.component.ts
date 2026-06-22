import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyService, ActiveRental, CompanyResponseDto } from '../../services/company';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <header class="content-header">
        <div class="breadcrumb">Executive Dashboard / Analytics</div>
        <h2>Operations Overview</h2>
      </header>

      <!-- KPI Grid -->
      <div class="stats-grid">
        <div class="glass-card stat-card">
          <div class="stat-icon">🚚</div>
          <div class="stat-info">
            <span class="stat-label">Active Deployments</span>
            <span class="stat-val font-mono">{{ activeDeployments }}</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <span class="stat-label">Outstanding Balance</span>
            <span class="stat-val font-mono text-danger">{{ totalOutstanding | currency }}</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-info">
            <span class="stat-label">Machinery Utilization</span>
            <span class="stat-val font-mono text-info">{{ utilizationRate }}%</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon">🌟</div>
          <div class="stat-info">
            <span class="stat-label">Active Partners</span>
            <span class="stat-val font-mono text-success">{{ companies.length }}</span>
          </div>
        </div>
      </div>

      <!-- Main Visual Layout -->
      <div class="visual-layout">
        <!-- Deployments Ledger -->
        <section class="glass-card ledger-section">
          <div class="card-header">
            <h3>Recent Active Deployments</h3>
            <span class="badge">{{ rentals.length }} Total Rentals</span>
          </div>

          <div class="table-scroll-container">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Machinery</th>
                  <th>Client Partner</th>
                  <th>Rental Timeline</th>
                  <th class="text-right">Net Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of rentals">
                  <td>
                    <div class="machine-name-cell">{{ r.machineName }}</div>
                    <small class="font-mono text-muted">{{ r.plateNumber }}</small>
                  </td>
                  <td>{{ r.companyName }}</td>
                  <td>
                    <span class="timeline-dates">
                      {{ r.startDate | date:'shortDate' }} → {{ r.endDate | date:'shortDate' }}
                    </span>
                  </td>
                  <td class="text-right font-mono">{{ r.totalAmount | currency }}</td>
                  <td>
                    <span class="status-indicator" [ngClass]="getDynamicStatus(r).toLowerCase()">
                      {{ getDynamicStatus(r) }}
                    </span>
                  </td>
                </tr>
                <tr *ngIf="rentals.length === 0">
                  <td colspan="5" class="empty-state-row">
                    No active rental items found in system database.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Fleet Distribution -->
        <section class="glass-card fleet-status-card">
          <div class="card-header">
            <h3>Fleet Distribution</h3>
          </div>
          <div class="fleet-list">
            <div class="fleet-item" *ngFor="let item of fleetStatus">
              <div class="fleet-item-info">
                <span class="fleet-name">{{ item.name }}</span>
                <span class="fleet-count">{{ item.activeCount }} active</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-fill" [style.width.%]="item.percent"></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      padding: 1rem 0;
      animation: fadeIn 0.4s ease-out;
    }

    .content-header {
      margin-bottom: 0.5rem;
    }

    .breadcrumb {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin-bottom: 0.25rem;
    }

    h2 {
      font-size: 2rem;
      font-weight: 700;
      color: #0f172a;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
    }

    .glass-card {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.45);
      border-radius: 16px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
      padding: 1.5rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .glass-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.08);
      border-color: rgba(255, 255, 255, 0.6);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .stat-icon {
      font-size: 2.25rem;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(241, 245, 249, 0.9);
      border-radius: 12px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-val {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
    }

    .visual-layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
    }

    @media (max-width: 1024px) {
      .visual-layout {
        grid-template-columns: 1fr;
      }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(226, 232, 240, 0.6);
      padding-bottom: 0.75rem;
    }

    .card-header h3 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #1e293b;
    }

    .badge {
      background: rgba(226, 232, 240, 0.8);
      color: #475569;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
    }

    .table-scroll-container {
      overflow-x: auto;
      border-radius: 12px;
    }

    .glass-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .glass-table th {
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-bottom: 2px solid rgba(226, 232, 240, 0.8);
    }

    .glass-table td {
      padding: 1rem;
      font-size: 0.875rem;
      border-bottom: 1px solid rgba(226, 232, 240, 0.5);
      color: #334155;
    }

    .machine-name-cell {
      font-weight: 600;
      color: #0f172a;
    }

    .timeline-dates {
      font-size: 0.8rem;
      background: rgba(241, 245, 249, 0.6);
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
    }

    .status-indicator {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      letter-spacing: 0.02em;
    }

    .status-indicator.active {
      background: #dcfce7;
      color: #15803d;
    }

    .status-indicator.returned {
      background: #f1f5f9;
      color: #475569;
    }

    .status-indicator.pending {
      background: #fef08a;
      color: #854d0e;
    }

    .status-indicator.completed {
      background: #e2e8f0;
      color: #475569;
    }

    .status-indicator.cancelled {
      background: #fee2e2;
      color: #b91c1c;
    }

    .empty-state-row {
      text-align: center;
      padding: 3rem !important;
      color: #64748b;
      font-style: italic;
    }

    .fleet-status-card {
      display: flex;
      flex-direction: column;
    }

    .fleet-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .fleet-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .fleet-item-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .fleet-name {
      font-weight: 600;
      color: #1e293b;
    }

    .fleet-count {
      color: #64748b;
    }

    .progress-bar-container {
      width: 100%;
      height: 6px;
      background: #e2e8f0;
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #0ea5e9);
      border-radius: 9999px;
      transition: width 0.8s ease-out;
    }

    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .text-right {
      text-align: right;
    }

    .text-danger {
      color: #ef4444;
    }

    .text-info {
      color: #0ea5e9;
    }

    .text-success {
      color: #10b981;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private companyService = inject(CompanyService);

  rentals: ActiveRental[] = [];
  companies: CompanyResponseDto[] = [];
  
  activeDeployments = 0;
  totalOutstanding = 0;
  utilizationRate = 0;

  fleetStatus: { name: string; activeCount: number; percent: number }[] = [];

  ngOnInit(): void {
    this.companyService.getCompanies().subscribe(data => {
      this.companies = data;
      this.calculateOutstanding();
    });

    this.companyService.getRentals().subscribe(data => {
      this.rentals = data;
      this.calculateMetrics();
      this.calculateFleetDistribution();
    });
  }

  getDynamicStatus(rental: ActiveRental): string {
    if (rental.status === 'Cancelled') return 'Cancelled';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(rental.startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(rental.endDate);
    end.setHours(0, 0, 0, 0);
    
    if (today < start) return 'Pending';
    if (today > end) return 'Completed';
    return 'Active';
  }

  calculateOutstanding(): void {
    this.totalOutstanding = this.companies.reduce((sum, c) => sum + c.outstandingBalance, 0);
  }

  calculateMetrics(): void {
    const active = this.rentals.filter(r => r.status !== 'Cancelled' && r.status !== 'Returned');
    this.activeDeployments = active.length;
    
    // Hardcoded max fleet of 15 machinery assets
    const maxFleet = 15;
    this.utilizationRate = Math.round((this.activeDeployments / maxFleet) * 100);
  }

  calculateFleetDistribution(): void {
    const active = this.rentals.filter(r => r.status !== 'Cancelled' && r.status !== 'Returned');
    
    const groups: { [key: string]: number } = {};
    active.forEach(r => {
      groups[r.machineName] = (groups[r.machineName] || 0) + 1;
    });

    const mockInventoryCounts: { [key: string]: number } = {
      'Excavator X3000': 5,
      'Caterpillar Loader': 5,
      'Tower Crane T1': 2,
      'Bulldozer D9': 4,
      'Asphalt Paver': 3
    };

    this.fleetStatus = Object.keys(mockInventoryCounts).map(name => {
      const activeCount = groups[name] || 0;
      const total = mockInventoryCounts[name] || 1;
      return {
        name,
        activeCount,
        percent: Math.round((activeCount / total) * 100)
      };
    });
  }
}
