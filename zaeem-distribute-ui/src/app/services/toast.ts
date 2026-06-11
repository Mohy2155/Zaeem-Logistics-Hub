import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  message: string;
  isError: boolean;
  show: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<Toast>({ message: '', isError: false, show: false });
  toast$ = this.toastSubject.asObservable();

  show(message: string, isError: boolean = false): void {
    this.toastSubject.next({ message, isError, show: true });
    setTimeout(() => this.hide(), 3000);
  }

  hide(): void {
    this.toastSubject.next({ ...this.toastSubject.value, show: false });
  }
}
