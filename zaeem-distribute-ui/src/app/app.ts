import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ToastService } from './services/toast';
import { environment } from '../environments/environment';

// Shell only: sidebar, router outlet and global toast. Page logic lives in pages/*.
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  toast$ = inject(ToastService).toast$;

  get isDemoEnvironment(): boolean {
    return environment.useMockData;
  }

  resetDemoData(): void {
    if (confirm('Are you sure you want to reset all demo data? This will clear local storage and reload the page.')) {
      localStorage.clear();
      window.location.reload();
    }
  }
}
