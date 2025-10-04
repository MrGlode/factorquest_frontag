// src/app/services/notification.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'achievement' | 'level' | 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  icon?: string;
  duration?: number; // en ms
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private notifications: Notification[] = [];
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private nextId = 1;

  constructor() {}

  // Afficher une notification
  show(notification: Omit<Notification, 'id' | 'timestamp'>): void {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${this.nextId++}`,
      timestamp: Date.now(),
      duration: notification.duration || 5000 // 5s par défaut
    };

    this.notifications.unshift(newNotification);
    this.notificationsSubject.next([...this.notifications]);

    // Auto-suppression après la durée
    if (newNotification.duration) {
      setTimeout(() => {
        this.remove(newNotification.id);
      }, newNotification.duration);
    }
  }

  // Notification de succès
  success(title: string, message: string, duration?: number): void {
    this.show({
      type: 'success',
      title,
      message,
      icon: '✅',
      duration
    });
  }

  // Notification d'erreur
  error(title: string, message: string, duration?: number): void {
    this.show({
      type: 'error',
      title,
      message,
      icon: '❌',
      duration: duration || 8000 // Erreurs plus longues
    });
  }

  // Notification d'info
  info(title: string, message: string, duration?: number): void {
    this.show({
      type: 'info',
      title,
      message,
      icon: 'ℹ️',
      duration
    });
  }

  // Notification d'achievement
  achievement(name: string, description: string, icon: string, reward?: string): void {
    this.show({
      type: 'achievement',
      title: `🏆 Achievement débloqué: ${name}`,
      message: `${description}${reward ? `\nRécompense: ${reward}` : ''}`,
      icon,
      duration: 8000 // Plus long pour les achievements
    });
  }

  // Notification de montée de niveau
  levelUp(level: number): void {
    this.show({
      type: 'level',
      title: `⭐ Niveau ${level} atteint !`,
      message: `Félicitations ! Vous progressez bien !`,
      icon: '🎉',
      duration: 6000
    });
  }

  // Supprimer une notification
  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notificationsSubject.next([...this.notifications]);
  }

  // Supprimer toutes les notifications
  clearAll(): void {
    this.notifications = [];
    this.notificationsSubject.next([]);
  }

  // Obtenir toutes les notifications
  getAll(): Notification[] {
    return [...this.notifications];
  }
}