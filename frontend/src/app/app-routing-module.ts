import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Verify } from './components/verify/verify';
import { Home } from './components/home/home';
import { Villas } from './components/villas/villas';
import { Admin } from './components/admin/admin';
import { EmployeeDashboard } from './components/employee-dashboard/employee-dashboard';
import { authGuard } from './guards/auth';
import { adminGuard } from './guards/admin';
import { roleGuard } from './guards/role';

const routes: Routes = [
  { path: 'home', component: Home },
  { path: 'villas', component: Villas },
  { path: 'login', component: Login },
  { path: 'verify', component: Verify },
  { path: 'admin', component: Admin },
  { path: 'employee-dashboard', component: EmployeeDashboard, canActivate: [roleGuard], data: { roles: ['admin', 'management'] } },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
