import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { HotelService, Villa, Booking } from '../../services/hotel';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

export type BookingPhase = 'selection' | 'rooms' | 'details' | 'identity' | 'payment' | 'success';

interface VillaCard {
  type: '1 BHK' | '2 BHK' | '3 BHK';
  title: string;
  description: string;
  price: number;
  image: string;
  icon: string;
}

@Component({
  selector: 'app-villas',
  standalone: false,
  templateUrl: './villas.html',
  styleUrl: './villas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Villas implements OnInit {
  currentPhase = signal<BookingPhase>('selection');
  selectedVillaType = signal<VillaCard | null>(null);
  selectedRoom = signal<Villa | null>(null);
  
  // Form Signals
  bookingForm = {
    name: signal(''),
    address: signal(''),
    phone: signal(''),
    email: signal(''),
    idProof: signal<File | null>(null),
    idProofUrl: signal<string | null>(null),
    paymentMethod: signal('credit-card'),
    checkIn: signal(''),
    checkOut: signal('')
  };

  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Calendar State
  viewDate = signal(new Date());
  activePicker = signal<'checkIn' | 'checkOut' | null>(null);

  calendarDays = computed(() => {
    const date = this.viewDate();
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Days in current month
    const days = [];
    
    // Padding from previous month
    const startDay = startOfMonth.getDay();
    const prevMonthEnd = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ 
        date: new Date(date.getFullYear(), date.getMonth() - 1, prevMonthEnd - i), 
        currentMonth: false 
      });
    }
    
    // Current month days
    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      days.push({ 
        date: new Date(date.getFullYear(), date.getMonth(), i), 
        currentMonth: true 
      });
    }
    
    // Padding for next month to make it 42 days (6 weeks)
    const padding = 42 - days.length;
    for (let i = 1; i <= padding; i++) {
      days.push({ 
        date: new Date(date.getFullYear(), date.getMonth() + 1, i), 
        currentMonth: false 
      });
    }
    
    return days;
  });

  uploadProgress = signal(0);
  bookingLoading = signal(false);
  bookingId = Math.floor(100000 + Math.random() * 900000);

  // Real-time stats
  villas = signal<Villa[]>([]);
  stats = computed(() => {
    const all = this.villas();
    return {
      total: all.length,
      available: all.filter(v => v.status === 'Available').length,
      booked: all.filter(v => v.status === 'Booked').length
    };
  });

  villaCards: VillaCard[] = [
    {
      type: '1 BHK',
      title: 'Studio Oasis',
      description: 'Elegant sanctuary perfect for couples or solo travelers seeking harmony.',
      price: 5000,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      icon: 'fa-house-user'
    },
    {
      type: '2 BHK',
      title: 'Family Retreat',
      description: 'Spacious residence designed for families seeking luxury and comfort.',
      price: 8000,
      image: '/family_retreat_2bhk.png',
      icon: 'fa-people-roof'
    },
    {
      type: '3 BHK',
      title: 'Grand Azure Villa',
      description: 'Ultimate estate experience with panoramic views and premium amenities.',
      price: 12000,
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
      icon: 'fa-wheat-awn-circle-exclamation'
    }
  ];

  constructor(
    private hotelService: HotelService, 
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.refreshVillas();
    // Initialize dates in local time
    this.bookingForm.checkIn.set(this.formatDate(new Date()));
    const checkout = new Date();
    checkout.setDate(checkout.getDate() + 3);
    this.bookingForm.checkOut.set(this.formatDate(checkout));
  }

  refreshVillas() {
    console.log('🏗️ [UI] Refreshing resort villas from server...');
    this.hotelService.getVillas().subscribe({
      next: (v) => {
        console.log(`🏗️ [UI] Villas fetched: ${v.length} estates detected.`);
        this.villas.set(v);
      },
      error: (err) => console.error('🏗️ [UI] Villa refresh error:', err)
    });
  }

  selectVillaType(card: VillaCard) {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.selectedVillaType.set(card);
    this.currentPhase.set('rooms');
  }

  selectRoom(room: Villa) {
    this.selectedRoom.set(room);
    this.currentPhase.set('details');
  }

  // Filtered villas for the selected category
  filteredRooms = computed(() => {
    const type = this.selectedVillaType()?.type;
    return this.villas().filter(v => v.category === type);
  });

  goToPhase(phase: BookingPhase) {
    this.currentPhase.set(phase);
  }

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.bookingForm.idProof.set(file);
      // Simulate upload progress
      this.uploadProgress.set(0);
      const interval = setInterval(() => {
        this.uploadProgress.update(v => {
          if (v >= 100) {
            clearInterval(interval);
            this.bookingForm.idProofUrl.set(URL.createObjectURL(file));
            return 100;
          }
          return v + 10;
        });
      }, 100);
    }
  }

  finalizeBooking() {
    this.bookingLoading.set(true);
    
    // Use the explicitly selected room
    const room = this.selectedRoom();
    if (!room || room.status !== 'Available') {
      this.bookingLoading.set(false);
      alert(`Apologies, but this specific residence is currently booked.`);
      this.currentPhase.set('rooms');
      return;
    }

    const card = this.selectedVillaType();
    if (!card) return;

    // Simulate a brief delay for "processing payment"
    setTimeout(() => {
      const booking: Booking = {
        villaName: `${room.category} - House ${room.number}`,
        villaId: room.id,
        guestName: this.bookingForm.name(),
        phone: this.bookingForm.phone(),
        address: this.bookingForm.address(),
        idProofUrl: this.bookingForm.idProofUrl() ?? undefined,
        checkIn: this.bookingForm.checkIn(),
        checkOut: this.bookingForm.checkOut(),
        totalPrice: card.price * 1.15 // 15% VIP Service & Experience Fee
      };

      this.hotelService.createBooking(booking).subscribe({
        next: (response) => {
          console.log('🏨 [BOOKING] Success reply from backend:', response);
          this.bookingLoading.set(false);
          this.currentPhase.set('success');
          this.refreshVillas(); // Update room statuses immediately
        },
        error: (err) => {
          this.bookingLoading.set(false);
          alert(err.error?.message || 'Booking failed.');
        }
      });
    }, 500);
  }

  reset() {
    this.currentPhase.set('selection');
    this.selectedVillaType.set(null);
    this.selectedRoom.set(null);
    this.bookingForm.name.set('');
    this.bookingForm.phone.set('');
    this.bookingForm.email.set('');
    this.bookingForm.address.set('');
    this.bookingForm.idProof.set(null);
    this.bookingId = Math.floor(100000 + Math.random() * 900000);
    this.router.navigate(['/home']);
  }

  // Calendar Helpers
  togglePicker(picker: 'checkIn' | 'checkOut') {
    if (this.activePicker() === picker) {
      this.activePicker.set(null);
    } else {
      this.activePicker.set(picker);
      // Reset view date to the selected date if it exists
      const currentVal = picker === 'checkIn' ? this.bookingForm.checkIn() : this.bookingForm.checkOut();
      if (currentVal) this.viewDate.set(new Date(currentVal));
    }
  }

  changeMonth(offset: number) {
    const current = this.viewDate();
    this.viewDate.set(new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  selectCalendarDate(date: Date) {
    const formatted = this.formatDate(date);
    const picker = this.activePicker();
    
    if (picker === 'checkIn') {
      this.bookingForm.checkIn.set(formatted);
      // Ensure checkout is after checkin
      const checkOutDate = new Date(this.bookingForm.checkOut());
      if (date >= checkOutDate) {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        this.bookingForm.checkOut.set(this.formatDate(nextDay));
      }
    } else if (picker === 'checkOut') {
      const checkInDate = new Date(this.bookingForm.checkIn());
      if (date <= checkInDate) {
        alert("Check-out must be after check-in.");
        return;
      }
      this.bookingForm.checkOut.set(formatted);
    }
    
    this.activePicker.set(null);
  }

  isDateSelected(date: Date): boolean {
    const formatted = this.formatDate(date);
    return formatted === this.bookingForm.checkIn() || formatted === this.bookingForm.checkOut();
  }

  isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
  }

  isDateDisabled(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }
}
