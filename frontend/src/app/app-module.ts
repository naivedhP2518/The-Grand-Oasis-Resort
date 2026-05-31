import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { tokenInterceptor } from './interceptors/token.interceptor';
import { ServiceWorkerModule } from '@angular/service-worker';
import { isDevMode } from '@angular/core';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Login } from './components/login/login';
import { Verify } from './components/verify/verify';
import { Dashboard } from './components/dashboard/dashboard';
import { Home } from './components/home/home';
import { Villas } from './components/villas/villas';
import { Admin } from './components/admin/admin';
import { EmployeeDashboard } from './components/employee-dashboard/employee-dashboard';
import { Chatbot } from './components/chatbot/chatbot';
import { HotelService } from './services/hotel';

@NgModule({
  declarations: [
    App,
    Login,
    Verify,
    Dashboard,
    Home,
    Villas,
    Admin,
    EmployeeDashboard,
    Chatbot
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([tokenInterceptor]))
  ],
  bootstrap: [App]
})
export class AppModule { }
