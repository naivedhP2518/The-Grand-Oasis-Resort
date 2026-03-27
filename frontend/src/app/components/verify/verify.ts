import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-verify',
  standalone: false,
  templateUrl: './verify.html',
  styleUrl: './verify.css',
})
export class Verify implements OnInit {
  code: string = '';
  loading: boolean = false;
  message: string = '';
  email: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.email = this.authService.getEmail();
    if (!this.email) {
      this.router.navigate(['/login']);
    }
  }

  onVerify() {
    if (!this.code) {
      this.message = 'Code toh daalo janab!';
      return;
    }

    this.loading = true;
    this.authService.verifyCode(this.code).subscribe({
      next: (res) => {
        this.loading = false;
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.loading = false;
        this.message = err.error?.message || 'Galat code hai janab';
      }
    });
  }
}
