import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Verify } from './components/verify/verify';
import { Home } from './components/home/home';
import { Villas } from './components/villas/villas';
import { Admin } from './components/admin/admin';
import { authGuard } from './guards/auth';
import { adminGuard } from './guards/admin';

const routes: Routes = [
  { path: 'home', component: Home },
  { path: 'villas', component: Villas },
  { path: 'login', component: Login },
  { path: 'verify', component: Verify },
  { path: 'admin', component: Admin, canActivate: [adminGuard] },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
