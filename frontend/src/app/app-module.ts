import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Login } from './components/login/login';
import { Verify } from './components/verify/verify';
import { Dashboard } from './components/dashboard/dashboard';
import { Home } from './components/home/home';
import { Villas } from './components/villas/villas';
import { Admin } from './components/admin/admin';
import { HotelService } from './services/hotel';

@NgModule({
  declarations: [
    App,
    Login,
    Verify,
    Dashboard,
    Home,
    Villas,
    Admin
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient()
  ],
  bootstrap: [App]
})
export class AppModule { }
