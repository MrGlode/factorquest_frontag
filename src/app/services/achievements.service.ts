// src/app/services/achievements.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { SaveService } from './save.service';
import { PlayerStatsService } from './player-stats.service';
import { NotificationService } from './notifications.service';
import { Achievement, AchievementProgress } from '../models/player.model';

@Injectable({
  providedIn: 'root'
})
export class AchievementsService {

  private achievements: Achievement[] = [];
  private unlockedAchievements: Set<string> = new Set();

  private achievementsSubject = new BehaviorSubject<Achievement[]>([]);
  public achievements$ = this.achievementsSubject.asObservable();

  private progressSubject = new BehaviorSubject<AchievementProgress[]>([]);
  public progress$ = this.progressSubject.asObservable();

  constructor(
    private authService: AuthService,
    private saveService: SaveService,
    private playerStatsService: PlayerStatsService,
    private notificationService: NotificationService
  ) {
    this.initializeAchievements();
    
    // Charger les achievements débloqués quand l'utilisateur se connecte
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadUnlockedAchievements();
        this.updateProgress();
      } else {
        this.unlockedAchievements.clear();
      }
    });

    // Mettre à jour la progression quand les stats changent
    this.playerStatsService.stats$.subscribe(() => {
      this.updateProgress();
    });
  }

  // Initialiser la liste des achievements
  private initializeAchievements(): void {
    this.achievements = [
      // === ÉCONOMIE ===
      {
        id: 'first_fortune',
        name: 'Première fortune',
        description: 'Gagner 50 000 crédits au total',
        icon: '💰',
        category: 'economy',
        requirement: { type: 'money_earned', target: 50000 },
        reward: { type: 'experience', amount: 100 },
        isSecret: false
      },
      {
        id: 'millionaire',
        name: 'Millionnaire',
        description: 'Gagner 1 000 000 crédits au total',
        icon: '💎',
        category: 'economy',
        requirement: { type: 'money_earned', target: 1000000 },
        reward: { type: 'money', amount: 50000 },
        isSecret: false
      },
      {
        id: 'big_spender',
        name: 'Gros dépensier',
        description: 'Dépenser 100 000 crédits',
        icon: '💸',
        category: 'economy',
        requirement: { type: 'money_earned', target: 100000 },
        reward: { type: 'experience', amount: 150 },
        isSecret: false
      },

      // === PRODUCTION ===
      {
        id: 'first_machine',
        name: 'Industriel débutant',
        description: 'Acheter votre première machine',
        icon: '⚙️',
        category: 'production',
        requirement: { type: 'machines_bought', target: 1 },
        reward: { type: 'experience', amount: 50 },
        isSecret: false
      },
      {
        id: 'machine_collector',
        name: 'Collectionneur de machines',
        description: 'Posséder 10 machines',
        icon: '🏭',
        category: 'production',
        requirement: { type: 'machines_bought', target: 10 },
        reward: { type: 'money', amount: 10000 },
        isSecret: false
      },
      {
        id: 'production_master',
        name: 'Maître de la production',
        description: 'Produire 10 000 ressources',
        icon: '📦',
        category: 'production',
        requirement: { type: 'resources_produced', target: 10000 },
        reward: { type: 'experience', amount: 300 },
        isSecret: false
      },

      // === RECHERCHE ===
      {
        id: 'researcher',
        name: 'Chercheur',
        description: 'Compléter votre première recherche',
        icon: '🔬',
        category: 'research',
        requirement: { type: 'researches_completed', target: 1 },
        reward: { type: 'experience', amount: 100 },
        isSecret: false
      },
      {
        id: 'science_master',
        name: 'Maître des sciences',
        description: 'Compléter 10 recherches',
        icon: '🧪',
        category: 'research',
        requirement: { type: 'researches_completed', target: 10 },
        reward: { type: 'money', amount: 20000 },
        isSecret: false
      },

      // === COLLECTION ===
      {
        id: 'merchant',
        name: 'Marchand',
        description: 'Vendre 1 000 ressources',
        icon: '🛒',
        category: 'collection',
        requirement: { type: 'resources_produced', target: 1000 },
        reward: { type: 'experience', amount: 200 },
        isSecret: false
      },
      {
        id: 'order_fulfiller',
        name: 'Fournisseur fiable',
        description: 'Compléter 5 commandes spéciales',
        icon: '📋',
        category: 'collection',
        requirement: { type: 'special_orders', target: 5 },
        reward: { type: 'money', amount: 15000 },
        isSecret: false
      },

      // === SPÉCIAL ===
      {
        id: 'dedicated_player',
        name: 'Joueur dévoué',
        description: 'Jouer pendant 10 heures',
        icon: '⏰',
        category: 'special',
        requirement: { type: 'play_time', target: 10 * 60 * 60 * 1000 }, // 10h en ms
        reward: { type: 'experience', amount: 500 },
        isSecret: false
      },
      {
        id: 'secret_achievement',
        name: '???',
        description: 'Un secret bien gardé...',
        icon: '🎁',
        category: 'special',
        requirement: { type: 'specific_action', target: 1 },
        reward: { type: 'money', amount: 100000 },
        isSecret: true
      }
    ];

    this.achievementsSubject.next([...this.achievements]);
  }

  // Charger les achievements débloqués
  private loadUnlockedAchievements(): void {
    const unlocked = this.saveService.load<string[]>('achievements') || [];
    this.unlockedAchievements = new Set(unlocked);
  }

  // Sauvegarder les achievements débloqués
  private saveUnlockedAchievements(): void {
    this.saveService.save('achievements', Array.from(this.unlockedAchievements));
  }

  // Mettre à jour la progression de tous les achievements
  private updateProgress(): void {
    const stats = this.playerStatsService.getStats();
    if (!stats) return;

    const progress: AchievementProgress[] = this.achievements.map(achievement => {
      const isUnlocked = this.unlockedAchievements.has(achievement.id);
      let current = 0;

      // Calculer la progression en fonction du type
      switch (achievement.requirement.type) {
        case 'money_earned':
          current = stats.totalMoneyEarned;
          break;
        case 'machines_bought':
          current = stats.machinesBought;
          break;
        case 'resources_produced':
          current = stats.resourcesProduced;
          break;
        case 'researches_completed':
          current = stats.researchesCompleted;
          break;
        case 'special_orders':
          current = stats.specialOrdersCompleted;
          break;
        case 'play_time':
          current = stats.totalPlayTime;
          break;
      }

      const target = achievement.requirement.target;
      const percentage = Math.min((current / target) * 100, 100);

      // Vérifier si on doit débloquer
      if (!isUnlocked && current >= target) {
        this.unlockAchievement(achievement.id);
      }

      return {
        achievementId: achievement.id,
        current,
        target,
        percentage,
        isUnlocked,
        unlockedAt: isUnlocked ? new Date() : undefined // TODO: stocker la vraie date
      };
    });

    this.progressSubject.next(progress);
  }

  // Débloquer un achievement
  private unlockAchievement(achievementId: string): void {
    if (this.unlockedAchievements.has(achievementId)) return;

    const achievement = this.achievements.find(a => a.id === achievementId);
    if (!achievement) return;

    this.unlockedAchievements.add(achievementId);
    this.saveUnlockedAchievements();

    // Formater la récompense pour la notification
    let rewardText = '';
    if (achievement.reward) {
      if (achievement.reward.type === 'money') {
        rewardText = `💰 ${achievement.reward.amount} crédits`;
      } else if (achievement.reward.type === 'experience') {
        rewardText = `⭐ ${achievement.reward.amount} XP`;
      }
    }

    // Afficher la notification
    this.notificationService.achievement(
      achievement.name,
      achievement.description,
      achievement.icon,
      rewardText
    );

    console.log(`🏆 Achievement débloqué: ${achievement.name}!`);
  }

  // Débloquer un achievement secret manuellement
  public unlockSecretAchievement(): void {
    this.unlockAchievement('secret_achievement');
  }

  // Obtenir tous les achievements
  public getAllAchievements(): Achievement[] {
    return [...this.achievements];
  }

  // Obtenir les achievements débloqués
  public getUnlockedAchievements(): Achievement[] {
    return this.achievements.filter(a => this.unlockedAchievements.has(a.id));
  }

  // Obtenir la progression
  public getProgress(): AchievementProgress[] {
    return this.progressSubject.value;
  }

  // Obtenir le nombre d'achievements débloqués
  public getUnlockedCount(): number {
    return this.unlockedAchievements.size;
  }

  // Obtenir le pourcentage de complétion
  public getCompletionPercentage(): number {
    return (this.unlockedAchievements.size / this.achievements.length) * 100;
  }

  // Reset des achievements (pour debug)
  public reset(): void {
    this.unlockedAchievements.clear();
    this.saveUnlockedAchievements();
    this.updateProgress();
    console.log('🏆 Achievements réinitialisés');
  }
}