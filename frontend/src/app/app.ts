import { Component, signal } from '@angular/core';
import { AuthService } from './services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App {
  constructor(private authService: AuthService, private router: Router) {}

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isNoNavPage(): boolean {
    return this.router.url.includes('/admin');
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
  protected readonly title = signal('frontend');
}
