import { Component, OnInit } from '@angular/core';
import { HotelService, Villa } from '../../services/hotel';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  villas: Villa[] = [];
  loading: boolean = true;

  constructor(private hotelService: HotelService, private router: Router) {}

  ngOnInit(): void {
    this.hotelService.getVillas().subscribe({
      next: (data: Villa[]) => {
        this.villas = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error fetching villas:', err);
        this.loading = false;
      }
    });
  }

  onBookNow() {
    this.router.navigate(['/villas']);
  }
}
