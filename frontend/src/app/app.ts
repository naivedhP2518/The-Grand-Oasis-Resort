import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from './services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  isOffline = signal<boolean>(!navigator.onLine);
  cachedInvoices = signal<any[]>([]);

  private onlineHandler = () => this.isOffline.set(false);
  private offlineHandler = () => {
    this.isOffline.set(true);
    this.loadCachedInvoices();
  };

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
    this.loadCachedInvoices();
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }

  loadCachedInvoices() {
    try {
      const stored = localStorage.getItem('grand_oasis_cached_invoices');
      if (stored) {
        this.cachedInvoices.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load cached invoices', e);
    }
  }

  openCachedInvoice(invoiceId: string) {
    // Check if offline
    if (this.isOffline()) {
      const match = this.cachedInvoices().find(i => i.id === invoiceId);
      if (match) {
        alert(
          `📄 [OFFLINE SECURE INVOICE VAULT]\n\n` +
          `Invoice ID: ${match.id}\n` +
          `Resort Sanctuary: ${match.villaName}\n` +
          `Guest: ${match.guestName}\n` +
          `Check-in: ${new Date(match.checkIn).toLocaleDateString()}\n` +
          `Check-out: ${new Date(match.checkOut).toLocaleDateString()}\n` +
          `Total Price: ₹${match.totalPrice.toLocaleString()}\n\n` +
          `Status: Paid via Razorpay Gateway (Securely Cached Offline)`
        );
        return;
      }
    }
    window.open(`/api/payments/invoice/${invoiceId}`, '_blank');
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isManagement(): boolean {
    return this.authService.getRole() === 'management';
  }

  isNoNavPage(): boolean {
    return this.router.url.includes('/admin') || this.router.url.includes('/employee-dashboard');
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
  protected readonly title = signal('frontend');
}
