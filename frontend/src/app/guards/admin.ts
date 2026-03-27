import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const adminGuard = () => {
  // Everyone can now reach the /admin URL; the component handles the "GOD" password prompt.
  return true;
};
