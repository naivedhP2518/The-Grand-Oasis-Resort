import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';

export const roleGuard = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const expectedRoles = route.data['roles'] as Array<string>;
  const userRole = authService.getRole();

  if (expectedRoles && expectedRoles.includes(userRole)) {
    return true;
  }

  // Not authorized for this role
  router.navigate(['/home']);
  return false;
};
