import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyService, ActiveRental, Machinery } from '../../services/company';

@Component({
  selector: 'app-scheduler',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scheduler-container">
      <header class="content-header">
        <div class="breadcrumb">Executive Dashboard / Logistics</div>
        <h2>Machinery Schedule</h2>
      </header>

      <!-- Calendar Range Overview -->
      <div class="timeline-scope glass-card">
        <div class="scope-header">
          <div class="scope-info">
            <h3>Rental Timeline Overview</h3>
            <p class="text-muted">Displays active machinery deployments across the current scheduling window.</p>
          </div>
          <div class="legend">
            <span class="legend-item"><span class="color-dot active"></span> Deployments</span>
            <span class="legend-item"><span class="color-dot available"></span> Available</span>
          </div>
        </div>

        <!-- Schedule Grid -->
        <div class="schedule-grid">
          <!-- Calendar Header Columns -->
          <div class="grid-header-row">
            <div class="asset-col">Fleet Machinery</div>
            <div class="timeline-col">
              <div class="timeline-day-header" *ngFor="let day of daysRange">
                {{ day | date:'dd MMM' }}
              </div>
            </div>
          </div>

          <!-- Assets Schedules -->
          <div class="grid-asset-row" *ngFor="let asset of fleetSchedule">
            <div class="asset-col">
              <div class="asset-name">{{ asset.name }}</div>
              <small class="asset-category">{{ asset.category }}</small>
            </div>
            <div class="timeline-col grid-bars">
              <!-- Grid background lines -->
              <div class="grid-day-cell" *ngFor="let day of daysRange"></div>

              <!-- Active timeline blocks -->
              <div 
                *ngFor="let rental of asset.rentals" 
                class="timeline-block"
                [style.left.%]="rental.leftPercent"
                [style.width.%]="rental.widthPercent"
                [attr.title]="rental.companyName + ' | ' + (rental.startDate | date:'shortDate') + ' - ' + (rental.endDate | date:'shortDate')"
              >
                <div class="timeline-block-content">
                  <span class="client-label">{{ rental.companyName }}</span>
                  <span class="plate-label font-mono">{{ rental.plateNumber }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scheduler-container {
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

    .glass-card {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.45);
      border-radius: 16px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
      padding: 1.5rem;
    }

    .scope-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(226, 232, 240, 0.6);
      padding-bottom: 1rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .scope-info h3 {
      font-size: 1.2rem;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 0.25rem;
    }

    .legend {
      display: flex;
      gap: 1.5rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
    }

    .color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    .color-dot.active {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    }

    .color-dot.available {
      background: #e2e8f0;
    }

    .schedule-grid {
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 12px;
      overflow: hidden;
    }

    .grid-header-row {
      display: flex;
      background: rgba(248, 250, 252, 0.8);
      border-bottom: 2px solid #e2e8f0;
    }

    .grid-asset-row {
      display: flex;
      border-bottom: 1px solid rgba(226, 232, 240, 0.6);
    }

    .grid-asset-row:last-child {
      border-bottom: none;
    }

    .asset-col {
      width: 200px;
      min-width: 200px;
      padding: 1.25rem;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: rgba(255, 255, 255, 0.4);
    }

    .asset-name {
      font-weight: 600;
      color: #0f172a;
      font-size: 0.9rem;
    }

    .asset-category {
      font-size: 0.75rem;
      color: #64748b;
    }

    .timeline-col {
      flex-grow: 1;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      position: relative;
    }

    .timeline-day-header {
      padding: 0.75rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      text-align: center;
      border-right: 1px solid rgba(226, 232, 240, 0.8);
    }

    .timeline-day-header:last-child {
      border-right: none;
    }

    .grid-bars {
      padding: 0.75rem 0;
      min-height: 70px;
      align-items: center;
    }

    .grid-day-cell {
      height: 100%;
      border-right: 1px solid rgba(226, 232, 240, 0.5);
    }

    .grid-day-cell:last-child {
      border-right: none;
    }

    .timeline-block {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      height: 44px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
      display: flex;
      align-items: center;
      padding: 0 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .timeline-block:hover {
      transform: translateY(-50%) scale(1.02);
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
    }

    .timeline-block-content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      overflow: hidden;
    }

    .client-label {
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .plate-label {
      opacity: 0.8;
      font-size: 0.65rem;
    }

    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class SchedulerComponent implements OnInit {
  private companyService = inject(CompanyService);

  daysRange: Date[] = [];
  fleetSchedule: { name: string; category: string; rentals: any[] }[] = [];

  ngOnInit(): void {
    this.setupDaysRange();
    
    this.companyService.getMachinery().subscribe(machinery => {
      this.companyService.getRentals().subscribe(rentals => {
        this.buildSchedule(machinery, rentals);
      });
    });
  }

  setupDaysRange(): void {
    const range: Date[] = [];
    const today = new Date();
    // Use a 7-day view starting from today
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      range.push(d);
    }
    this.daysRange = range;
  }

  buildSchedule(machinery: Machinery[], rentals: ActiveRental[]): void {
    const activeRentals = rentals.filter(r => r.status !== 'Cancelled' && r.status !== 'Returned');
    const startWindow = this.daysRange[0];
    const endWindow = this.daysRange[this.daysRange.length - 1];

    this.fleetSchedule = machinery.map(machine => {
      // Find rentals for this specific machine
      const machineRentals = activeRentals.filter(r => r.machineName.toLowerCase().includes(machine.name.toLowerCase()) || machine.name.toLowerCase().includes(r.machineName.toLowerCase()));

      const formattedRentals = machineRentals.map(r => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);

        // Clamp dates to the current 7-day window for rendering
        const clampedStart = start < startWindow ? startWindow : start;
        const clampedEnd = end > endWindow ? endWindow : end;

        // Calculate visual percentages
        const totalDurationMs = endWindow.getTime() - startWindow.getTime() + 24 * 60 * 60 * 1000;
        const leftMs = clampedStart.getTime() - startWindow.getTime();
        const widthMs = clampedEnd.getTime() - clampedStart.getTime() + 24 * 60 * 60 * 1000;

        const leftPercent = Math.max(0, Math.min(100, (leftMs / totalDurationMs) * 100));
        const widthPercent = Math.max(5, Math.min(100 - leftPercent, (widthMs / totalDurationMs) * 100));

        return {
          ...r,
          leftPercent,
          widthPercent
        };
      });

      return {
        name: machine.name,
        category: machine.category,
        rentals: formattedRentals
      };
    });
  }
}
