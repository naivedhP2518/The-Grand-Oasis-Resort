import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { HotelService, Booking, Villa } from '../../services/hotel';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { SocketService } from '../../services/socket.service';
import { UploadService } from '../../services/upload.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrls: ['../../app.css'],
  standalone: false
})
export class Admin implements OnInit, OnDestroy {
  stats = signal<any>(null);
  bookings = signal<Booking[]>([]);
  villas = signal<Villa[]>([]);
  employees = signal<any[]>([]);
  users = signal<any[]>([]);
  notifications = signal<any[]>([]);
  unreadNotificationsCount = signal<number>(0);
  showNotificationsDropdown = signal<boolean>(false);
  activeTab = signal<'stats' | 'villas' | 'bookings' | 'employees' | 'users'>('stats');
  analyticsData = signal<any>(null);

  // Chart instances
  revenueChart: any = null;
  statusChart: any = null;
  categoryChart: any = null;

  private pollingSubscription: any = null;
  
  // Auth Logic
  isLocked = signal(true);
  passwordInput = signal('');
  loginError = signal(false);
  
  // Villa Form
  villaForm: FormGroup;
  showVillaModal = signal(false);
  editingVillaId = signal<number | null>(null);

  // Booking Form
  bookingForm: FormGroup;
  showBookingModal = signal(false);
  editingBookingId = signal<string | null>(null);
  
  // Employee Form
  employeeForm: FormGroup;
  showEmployeeModal = signal(false);

  // Confirmation & Error Modals
  showConfirmModal = signal(false);
  confirmTitle = signal('');
  confirmMessage = signal('');
  confirmType = signal<'danger' | 'info'>('info');
  onConfirmAction: (() => void) | null = null;

  showErrorModal = signal(false);
  errorTitle = signal('');
  errorMessage = signal('');

  uploadProgress = signal(0);

  constructor(
    private hotelService: HotelService,
    private authService: AuthService,
    private fb: FormBuilder,
    private socketService: SocketService,
    private uploadService: UploadService
  ) {
    this.villaForm = this.fb.group({
      number: ['', Validators.required],
      category: ['1 BHK', Validators.required],
      type: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      row: ['A', Validators.required],
      col: [1, [Validators.required, Validators.min(1)]],
      status: ['Available', Validators.required],
      maxCapacity: [2, [Validators.required, Validators.min(1)]],
      image: ['']
    });

    this.bookingForm = this.fb.group({
      guestName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      checkIn: ['', Validators.required],
      checkOut: ['', Validators.required],
      status: ['Confirmed', Validators.required],
      refundStatus: ['N/A', Validators.required]
    });

    this.employeeForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      email: ['', [Validators.email]]
    });

    // Suggest prices and capacity based on category
    this.villaForm.get('category')?.valueChanges.subscribe(cat => {
      const prices: any = { '1 BHK': 5000, '2 BHK': 8000, '3 BHK': 12000 };
      if (prices[cat]) this.villaForm.get('price')?.setValue(prices[cat]);
      const capacities: any = { '1 BHK': 2, '2 BHK': 4, '3 BHK': 6 };
      if (capacities[cat]) this.villaForm.get('maxCapacity')?.setValue(capacities[cat]);
    });
  }

  ngOnInit() {
    const savedPassword = sessionStorage.getItem('admin_master_password');
    if (savedPassword) {
      this.authService.verifyAdminPassword(savedPassword).subscribe({
        next: () => {
          this.isLocked.set(false);
          this.refreshAll();
          this.startNotificationPolling();
        },
        error: () => {
          sessionStorage.removeItem('admin_master_password');
          this.isLocked.set(true);
        }
      });
    }

    // Connect to WebSocket updates
    this.socketService.onNotificationReceived().subscribe((note) => {
      console.log('🔔 [SOCKET] Live notification received inside Admin:', note);
      // Prepend notification
      this.notifications.set([note, ...this.notifications()]);
      this.unreadNotificationsCount.set(this.unreadNotificationsCount() + 1);
      
      // Auto-refresh stats and ledger reactively in the background
      this.refreshAll();
    });

    this.socketService.onAvailabilityChange().subscribe(() => {
      console.log('🔄 [SOCKET] Live availability change detected inside Admin. Syncing views...');
      this.refreshAll();
    });
  }

  ngOnDestroy() {
    this.stopNotificationPolling();
    this.destroyCharts();
  }

  unlock() {
    if (!this.passwordInput()) {
      this.triggerError('Vault Locked', 'Please enter the master credential.');
      return;
    }

    this.authService.verifyAdminPassword(this.passwordInput()).subscribe({
      next: (res) => {
        sessionStorage.setItem('admin_master_password', this.passwordInput());
        this.isLocked.set(false);
        this.loginError.set(false);
        this.refreshAll();
        this.startNotificationPolling();
      },
      error: (err) => {
        this.triggerError('Vault Locked', 'Access Denied. The master credential provided does not match our records. Security protocol initiated.');
        this.passwordInput.set('');
      }
    });
  }

  exitAdmin() {
    this.stopNotificationPolling();
    this.isLocked.set(true);
    window.location.href = '/home';
  }

  signOut() {
    this.stopNotificationPolling();
    sessionStorage.removeItem('admin_master_password');
    this.isLocked.set(true);
    window.location.href = '/login';
  }

  refreshAll() {
    this.hotelService.getAdminStats().subscribe(s => this.stats.set(s));
    this.hotelService.getVillas().subscribe(v => this.villas.set(v));
    this.hotelService.getAllBookings().subscribe(b => this.bookings.set(b));
    this.authService.getEmployees().subscribe(e => this.employees.set(e));
    this.loadUsers();
    this.loadAnalytics();
  }

  setTab(tab: 'stats' | 'villas' | 'bookings' | 'employees' | 'users') {
    this.activeTab.set(tab);
    if (tab === 'stats') {
      this.initCharts();
    } else {
      this.destroyCharts();
    }
  }

  triggerConfirm(title: string, message: string, type: 'danger' | 'info', action: () => void) {
    this.confirmTitle.set(title);
    this.confirmMessage.set(message);
    this.confirmType.set(type);
    this.onConfirmAction = action;
    this.showConfirmModal.set(true);
  }

  executeConfirm() {
    if (this.onConfirmAction) {
      this.onConfirmAction();
    }
    this.closeConfirm();
  }

  closeConfirm() {
    this.showConfirmModal.set(false);
    this.onConfirmAction = null;
  }

  triggerError(title: string, message: string) {
    this.errorTitle.set(title);
    this.errorMessage.set(message);
    this.showErrorModal.set(true);
  }

  closeError() {
    this.showErrorModal.set(false);
  }

  // Villa Management
  onVillaImageUpload(event: any) {
    const file = event.target?.files?.[0] || event.dataTransfer?.files?.[0];
    if (file) {
      this.uploadProgress.set(10);
      this.uploadService.uploadIdProof(file).subscribe({
        next: (res) => {
          this.uploadProgress.set(100);
          this.villaForm.patchValue({ image: res.url });
          setTimeout(() => this.uploadProgress.set(0), 1000);
        },
        error: (err) => {
          console.error('[MEDIA] Image upload failed:', err);
          this.uploadProgress.set(0);
          alert('Failed to upload image. Please try again.');
        }
      });
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.onVillaImageUpload(event);
  }

  openAddVilla() {
    this.editingVillaId.set(null);
    this.villaForm.reset({ category: '1 BHK', row: 'A', col: 1, status: 'Available', image: '' });
    this.showVillaModal.set(true);
  }

  openEditVilla(villa: Villa) {
    this.editingVillaId.set(villa.id);
    this.villaForm.patchValue(villa);
    this.showVillaModal.set(true);
  }

  saveVilla() {
    if (this.villaForm.invalid) return;

    const villaData = this.villaForm.value;
    const id = this.editingVillaId();

    if (id) {
      this.hotelService.updateVilla(id, villaData).subscribe(() => {
        this.showVillaModal.set(false);
        this.refreshAll();
      });
    } else {
      this.hotelService.addVilla(villaData).subscribe(() => {
        this.showVillaModal.set(false);
        this.refreshAll();
      });
    }
  }

  deleteVilla(id: number) {
    this.triggerConfirm(
      'Remove Estate', 
      'Are you sure you want to remove this estate from the resort inventory?', 
      'danger', 
      () => this.hotelService.deleteVilla(id).subscribe(() => this.refreshAll())
    );
  }

  // Booking Management
  openEditBooking(booking: Booking) {
    this.editingBookingId.set(booking._id || booking.id || null);
    // Format checkIn and checkOut to YYYY-MM-DD for HTML5 date inputs
    const formattedBooking = {
      ...booking,
      checkIn: booking.checkIn ? booking.checkIn.split('T')[0] : '',
      checkOut: booking.checkOut ? booking.checkOut.split('T')[0] : ''
    };
    this.bookingForm.patchValue(formattedBooking);
    this.showBookingModal.set(true);
  }

  saveBooking() {
    if (this.bookingForm.invalid) return;
    const id = this.editingBookingId();
    if (!id) return;

    this.hotelService.adminUpdateBooking(id, this.bookingForm.value).subscribe(() => {
      this.showBookingModal.set(false);
      this.refreshAll();
    });
  }

  deleteBooking(id?: string) {
    if (!id) return;
    this.triggerConfirm(
      'Cancel Reservation', 
      'DANGER: Permanently remove this reservation? This will free up the villa immediately.', 
      'danger', 
      () => this.hotelService.adminDeleteBooking(id).subscribe(() => this.refreshAll())
    );
  }

  getStatusClass(status?: string) {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-700';
      case 'Booked': return 'bg-amber-100 text-amber-700';
      case 'Confirmed': return 'bg-blue-100 text-blue-700';
      case 'Pending Approval': return 'bg-amber-100 text-amber-700';
      case 'Completed': return 'bg-indigo-100 text-indigo-700';
      case 'Cancelled': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  // Employee Management
  openAddEmployee() {
    this.employeeForm.reset();
    this.showEmployeeModal.set(true);
  }

  saveEmployee() {
    if (this.employeeForm.invalid) return;
    this.authService.createEmployee(this.employeeForm.value).subscribe({
      next: () => {
        this.showEmployeeModal.set(false);
        this.refreshAll();
      },
      error: (err) => this.triggerError('Registry Error', err.error?.message || 'Access authorization failed. Please verify credentials.')
    });
  }
  
  deleteEmployee(id: string) {
    this.triggerConfirm(
      'Revoke Access', 
      'SECURITY WARNING: Are you sure you want to revoke management access for this user? This action cannot be undone.', 
      'danger', 
      () => {
        this.authService.deleteEmployee(id).subscribe({
          next: () => this.refreshAll(),
          error: (err) => this.triggerError('Security Breach', err.error?.message || 'Unable to revoke staff access at this time.')
        });
      }
    );
  }

  // Notification Engine Methods
  startNotificationPolling() {
    this.stopNotificationPolling();
    this.loadNotifications();
    this.pollingSubscription = setInterval(() => {
      this.loadNotifications();
    }, 10000);
  }

  stopNotificationPolling() {
    if (this.pollingSubscription) {
      clearInterval(this.pollingSubscription);
      this.pollingSubscription = null;
    }
  }

  loadNotifications() {
    this.hotelService.getNotifications().subscribe({
      next: (notes) => {
        this.notifications.set(notes);
        const unreadCount = notes.filter(n => !n.read).length;
        this.unreadNotificationsCount.set(unreadCount);
      },
      error: (err) => console.error("Error loading notifications:", err)
    });
  }

  markNotificationRead(id: string) {
    this.hotelService.markNotificationRead(id).subscribe(() => {
      this.loadNotifications();
    });
  }

  markAllNotificationsRead() {
    this.hotelService.markAllNotificationsRead().subscribe(() => {
      this.loadNotifications();
    });
  }

  // User Management Methods
  loadUsers() {
    this.authService.getAllUsers().subscribe({
      next: (u) => this.users.set(u),
      error: (err) => console.error("Error loading users:", err)
    });
  }

  changeUserRole(id: string, role: string) {
    this.authService.updateUserRole(id, role).subscribe({
      next: () => this.refreshAll(),
      error: (err) => this.triggerError('Access Control', err.error?.message || 'Unable to update user role.')
    });
  }

  deleteUser(id: string) {
    this.triggerConfirm(
      'Delete User Profile',
      'Are you sure you want to permanently delete this user profile? All associated historical data will be decoupled.',
      'danger',
      () => {
        this.authService.deleteUser(id).subscribe({
          next: () => this.refreshAll(),
          error: (err) => this.triggerError('Access Control', err.error?.message || 'Unable to delete user profile.')
        });
      }
    );
  }

  // Quick Ledger Action Triggers
  approveBooking(id?: string) {
    if (!id) return;
    this.triggerConfirm(
      'Approve Booking Request',
      'Confirm and approve this pending reservation? The guest will be checked in on schedule.',
      'info',
      () => {
        this.hotelService.adminUpdateBooking(id, { status: 'Confirmed' }).subscribe({
          next: () => this.refreshAll(),
          error: (err) => this.triggerError('Reservation Error', err.error?.message || 'Unable to approve reservation.')
        });
      }
    );
  }

  rejectBooking(id?: string) {
    if (!id) return;
    this.triggerConfirm(
      'Reject Booking Request',
      'Are you sure you want to reject this reservation? It will be cancelled and the assigned room will be released immediately.',
      'danger',
      () => {
        this.hotelService.adminUpdateBooking(id, { status: 'Cancelled' }).subscribe({
          next: () => this.refreshAll(),
          error: (err) => this.triggerError('Reservation Error', err.error?.message || 'Unable to reject reservation.')
        });
      }
    );
  }

  // Chart.js Orchestration
  loadAnalytics() {
    this.hotelService.getAdminAnalytics().subscribe({
      next: (data) => {
        this.analyticsData.set(data);
        if (this.activeTab() === 'stats') {
          this.initCharts();
        }
      },
      error: (err) => console.error("Error loading analytics:", err)
    });
  }

  destroyCharts() {
    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }
    if (this.statusChart) {
      this.statusChart.destroy();
      this.statusChart = null;
    }
    if (this.categoryChart) {
      this.categoryChart.destroy();
      this.categoryChart = null;
    }
  }

  initCharts() {
    this.destroyCharts();
    
    setTimeout(() => {
      const data = this.analyticsData();
      if (!data) return;

      const revCtx = document.getElementById('revenueChart') as HTMLCanvasElement;
      const statusCtx = document.getElementById('statusChart') as HTMLCanvasElement;
      const catCtx = document.getElementById('categoryChart') as HTMLCanvasElement;

      if (revCtx) {
        this.revenueChart = new Chart(revCtx, {
          type: 'line',
          data: {
            labels: data.revenueTimeline.map((r: any) => r.label),
            datasets: [{
              label: 'Revenue (INR)',
              data: data.revenueTimeline.map((r: any) => r.amount),
              borderColor: 'rgba(59, 130, 246, 1)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
              },
              x: {
                grid: { display: false },
                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
              }
            }
          }
        });
      }

      if (statusCtx) {
        this.statusChart = new Chart(statusCtx, {
          type: 'doughnut',
          data: {
            labels: data.statusDistribution.map((s: any) => s.status),
            datasets: [{
              data: data.statusDistribution.map((s: any) => s.count),
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(99, 102, 241, 0.8)',
                'rgba(239, 68, 68, 0.8)'
              ],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { color: 'rgba(255, 255, 255, 0.7)' }
              }
            }
          }
        });
      }

      if (catCtx) {
        this.categoryChart = new Chart(catCtx, {
          type: 'bar',
          data: {
            labels: data.categoryPopularity.map((c: any) => c.category),
            datasets: [{
              label: 'Demand (Reservations)',
              data: data.categoryPopularity.map((c: any) => c.count),
              backgroundColor: 'rgba(168, 85, 247, 0.8)',
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
              },
              x: {
                grid: { display: false },
                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
              }
            }
          }
        });
      }
    }, 150);
  }
}
