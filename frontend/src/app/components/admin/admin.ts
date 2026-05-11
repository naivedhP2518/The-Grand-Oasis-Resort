import { Component, OnInit, signal } from '@angular/core';
import { HotelService, Booking, Villa } from '../../services/hotel';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrls: ['../../app.css'],
  standalone: false
})
export class Admin implements OnInit {
  stats = signal<any>(null);
  bookings = signal<Booking[]>([]);
  villas = signal<Villa[]>([]);
  employees = signal<any[]>([]);
  activeTab = signal<'stats' | 'villas' | 'bookings' | 'employees'>('stats');
  
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

  constructor(
    private hotelService: HotelService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.villaForm = this.fb.group({
      number: ['', Validators.required],
      category: ['1 BHK', Validators.required],
      type: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      row: ['A', Validators.required],
      col: [1, [Validators.required, Validators.min(1)]],
      status: ['Available', Validators.required]
    });

    this.bookingForm = this.fb.group({
      guestName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      checkIn: ['', Validators.required],
      checkOut: ['', Validators.required],
      status: ['Confirmed', Validators.required]
    });

    this.employeeForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      email: ['', [Validators.email]]
    });

    // Suggest prices based on category
    this.villaForm.get('category')?.valueChanges.subscribe(cat => {
      const prices: any = { '1 BHK': 5000, '2 BHK': 8000, '3 BHK': 12000 };
      if (prices[cat]) this.villaForm.get('price')?.setValue(prices[cat]);
    });
  }

  ngOnInit() {
    const savedPassword = sessionStorage.getItem('admin_master_password');
    if (savedPassword === 'GOD') {
      this.isLocked.set(false);
      this.refreshAll();
    }
  }

  unlock() {
    if (this.passwordInput() === 'GOD') {
      sessionStorage.setItem('admin_master_password', 'GOD');
      this.isLocked.set(false);
      this.loginError.set(false);
      this.refreshAll();
    } else {
      this.triggerError('Vault Locked', 'Access Denied. The master credential provided does not match our records. Security protocol initiated.');
      this.passwordInput.set('');
    }
  }

  exitAdmin() {
    this.isLocked.set(true);
    window.location.href = '/home';
  }

  signOut() {
    sessionStorage.removeItem('admin_master_password');
    this.isLocked.set(true);
    window.location.href = '/login';
  }

  refreshAll() {
    this.hotelService.getAdminStats().subscribe(s => this.stats.set(s));
    this.hotelService.getVillas().subscribe(v => this.villas.set(v));
    this.hotelService.getAllBookings().subscribe(b => this.bookings.set(b));
    this.authService.getEmployees().subscribe(e => this.employees.set(e));
  }

  setTab(tab: 'stats' | 'villas' | 'bookings' | 'employees') {
    this.activeTab.set(tab);
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
  openAddVilla() {
    this.editingVillaId.set(null);
    this.villaForm.reset({ category: '1 BHK', row: 'A', col: 1, status: 'Available' });
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
    this.bookingForm.patchValue(booking);
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
}
