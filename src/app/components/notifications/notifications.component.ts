// src/app/components/notifications/notifications.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

import { NotificationService, Notification } from '../../services/notifications.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent {

  notifications$: Observable<Notification[]>;

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.notifications$;
  }

  // Fermer une notification
  close(id: string): void {
    this.notificationService.remove(id);
  }

  // Obtenir la classe CSS selon le type
  getNotificationClass(type: string): string {
    return `notification-${type}`;
  }
}