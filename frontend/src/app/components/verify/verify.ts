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
      this.message = 'Please enter the verification code.';
      return;
    }

    this.loading = true;
    this.authService.verifyCode(this.code).subscribe({
      next: (res) => {
        this.loading = false;
        if (this.authService.getRole() === 'management') {
          sessionStorage.setItem('admin_master_password', 'GOD');
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.message = err.error?.message || 'Invalid verification code.';
      }
    });
  }
}
