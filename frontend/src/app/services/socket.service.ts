import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private availabilityChange$ = new Subject<any>();
  private notificationReceived$ = new Subject<any>();

  constructor() {
    // In production this connects to host. In development proxy config handles requests or we use current base host.
    // Standard connection to local server or proxy route
    this.socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('🔌 [SOCKET] Connected to WebSocket server');
    });

    this.socket.on('availability_change', (data) => {
      console.log('📢 [SOCKET] Received availability_change:', data);
      this.availabilityChange$.next(data);
    });

    this.socket.on('new_notification', (data) => {
      console.log('📢 [SOCKET] Received new_notification:', data);
      this.notificationReceived$.next(data);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 [SOCKET] Disconnected from WebSocket server');
    });
  }

  // Reactive accessors
  onAvailabilityChange(): Observable<any> {
    return this.availabilityChange$.asObservable();
  }

  onNotificationReceived(): Observable<any> {
    return this.notificationReceived$.asObservable();
  }

  // Custom action emitter
  joinRoom(roomName: string) {
    this.socket.emit('join_room', roomName);
  }
}
