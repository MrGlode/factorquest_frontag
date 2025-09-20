import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MarketPrice, SpecialOrder, Transaction } from '../models/game.model';

@Injectable({
  providedIn: 'root'
})
export class MarketService {

  private marketPrices: MarketPrice[] = [];
  private specialOrders: SpecialOrder[] = [];
  private transactions: Transaction[] = [];
  
  private marketPricesSubject = new BehaviorSubject<MarketPrice[]>(this.marketPrices);
  private specialOrdersSubject = new BehaviorSubject<SpecialOrder[]>(this.specialOrders);
  private transactionsSubject = new BehaviorSubject<Transaction[]>(this.transactions);
  
  private nextOrderId = 1;
  private nextTransactionId = 1;

  // Prix de base des ressources
  private basePrices: { [key: string]: number } = {
    'iron_ore': 2,
    'copper_ore': 3,
    'coal': 1,
    'iron_plate': 8,
    'copper_plate': 10,
    'iron_wire': 15,
    'gear': 25
  };

  // Clients possibles pour les commandes spéciales
  private clients = {
    noble: ['Baron Von Steam', 'Comtesse Gearwright', 'Lord Cogsworth', 'Duchesse Brassman'],
    factory: ['Usine Mécanique', 'Manufacture Vapor', 'Forge Industrielle', 'Atelier Royal'],
    government: ['Ministère de l\'Industrie', 'Arsenal Impérial', 'Bureau des Inventions'],
    merchant: ['Compagnie des Métaux', 'Négoce Steam & Co', 'Maison du Cuivre']
  };

  constructor() {
    this.initializeMarket();
    this.loadFromStorage();
    this.startMarketFluctuations();
    this.generateInitialOrders();
  }

  // Observables
  getMarketPrices$(): Observable<MarketPrice[]> {
    return this.marketPricesSubject.asObservable();
  }

  getSpecialOrders$(): Observable<SpecialOrder[]> {
    return this.specialOrdersSubject.asObservable();
  }

  getTransactions$(): Observable<Transaction[]> {
    return this.transactionsSubject.asObservable();
  }

  // Initialiser le marché
  private initializeMarket(): void {
    Object.keys(this.basePrices).forEach(resourceId => {
      this.marketPrices.push({
        resourceId,
        basePrice: this.basePrices[resourceId],
        currentPrice: this.basePrices[resourceId],
        demand: 0.5 + Math.random() * 0.5, // 0.5 à 1.0
        lastSold: Date.now()
      });
    });
    this.marketPricesSubject.next([...this.marketPrices]);
  }

  // Fluctuations du marché
  private startMarketFluctuations(): void {
    setInterval(() => {
      this.updateMarketPrices();
    }, 30000); // Toutes les 30 secondes
  }

  private updateMarketPrices(): void {
    this.marketPrices.forEach(price => {
      // Fluctuation aléatoire de la demande
      const demandChange = (Math.random() - 0.5) * 0.1;
      price.demand = Math.max(0.1, Math.min(1.0, price.demand + demandChange));
      
      // Prix basé sur la demande + facteur temps
      const timeFactor = Math.max(0.8, 1 - ((Date.now() - price.lastSold) / (1000 * 60 * 60))); // Baisse si pas vendu
      price.currentPrice = Math.round(price.basePrice * price.demand * timeFactor);
    });
    
    this.marketPricesSubject.next([...this.marketPrices]);
    this.saveToStorage();
  }

  // Vendre des ressources sur le marché
  sellResource(resourceId: string, quantity: number): number {
    const marketPrice = this.marketPrices.find(p => p.resourceId === resourceId);
    if (!marketPrice) return 0;

    const totalValue = marketPrice.currentPrice * quantity;
    
    // Créer la transaction
    const transaction: Transaction = {
      id: `trans_${this.nextTransactionId++}`,
      resourceId,
      quantity,
      unitPrice: marketPrice.currentPrice,
      totalValue,
      timestamp: Date.now(),
      type: 'market'
    };
    
    this.transactions.push(transaction);
    this.transactionsSubject.next([...this.transactions]);
    
    // Mise à jour du marché (baisse de la demande après vente)
    marketPrice.lastSold = Date.now();
    marketPrice.demand = Math.max(0.1, marketPrice.demand - (quantity * 0.01));
    
    this.saveToStorage();
    return totalValue;
  }

  // Obtenir le prix actuel d'une ressource
  getCurrentPrice(resourceId: string): number {
    const marketPrice = this.marketPrices.find(p => p.resourceId === resourceId);
    return marketPrice ? marketPrice.currentPrice : 0;
  }

  // Générer des commandes spéciales
  generateInitialOrders(): void {
    for (let i = 0; i < 3; i++) {
      this.generateSpecialOrder();
    }
  }

  generateSpecialOrder(): void {
    const clientTypes = Object.keys(this.clients) as Array<keyof typeof this.clients>;
    const clientType = clientTypes[Math.floor(Math.random() * clientTypes.length)];
    const clientNames = this.clients[clientType];
    const clientName = clientNames[Math.floor(Math.random() * clientNames.length)];
    
    // Générer des exigences
    const availableResources = Object.keys(this.basePrices);
    const numRequirements = 1 + Math.floor(Math.random() * 3); // 1 à 3 ressources
    const requirements: any[] = [];
    
    for (let i = 0; i < numRequirements; i++) {
      const resourceId = availableResources[Math.floor(Math.random() * availableResources.length)];
      const quantity = 10 + Math.floor(Math.random() * 50); // 10 à 60 unités
      
      if (!requirements.find(r => r.resourceId === resourceId)) {
        requirements.push({ resourceId, quantity });
      }
    }
    
    // Calculer la récompense
    let baseReward = 0;
    requirements.forEach(req => {
      baseReward += this.basePrices[req.resourceId] * req.quantity;
    });
    
    const multiplier = this.getClientMultiplier(clientType);
    const reward = Math.round(baseReward * multiplier);
    const bonus = Math.round(reward * 0.2); // 20% de bonus
    
    const order: SpecialOrder = {
      id: `order_${this.nextOrderId++}`,
      clientName,
      clientType,
      requirements,
      reward,
      bonus,
      deadline: Date.now() + (2 * 60 * 60 * 1000), // 2 heures
      description: this.generateOrderDescription(clientType, requirements),
      isCompleted: false,
      isExpired: false
    };
    
    this.specialOrders.push(order);
    this.specialOrdersSubject.next([...this.specialOrders]);
    this.saveToStorage();
  }

  private getClientMultiplier(clientType: string): number {
    const multipliers = {
      noble: 1.5,
      government: 1.3,
      factory: 1.2,
      merchant: 1.1
    };
    return multipliers[clientType as keyof typeof multipliers] || 1.0;
  }

  private generateOrderDescription(clientType: string, requirements: any[]): string {
    const descriptions = {
      noble: [
        'Pour décorer mon manoir steampunk',
        'Mes automates ont besoin de réparations',
        'Construction d\'une nouvelle aile mécanique'
      ],
      factory: [
        'Production urgente pour nos clients',
        'Maintenance de nos machines industrielles',
        'Expansion de notre chaîne de montage'
      ],
      government: [
        'Projet confidentiel du Ministère',
        'Renforcement de la défense impériale',
        'Infrastructure publique steampunk'
      ],
      merchant: [
        'Commande pour nos partenaires commerciaux',
        'Stock pour la saison des fêtes',
        'Approvisionnement de nos filiales'
      ]
    };
    
    const typeDescriptions = descriptions[clientType as keyof typeof descriptions] || descriptions.merchant;
    return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
  }

  // Livrer une commande spéciale
  fulfillOrder(orderId: string, availableResources: { [key: string]: number }): { success: boolean; reward: number; message: string } {
    const order = this.specialOrders.find(o => o.id === orderId);
    if (!order || order.isCompleted || order.isExpired) {
      return { success: false, reward: 0, message: 'Commande non trouvée ou déjà traitée' };
    }
    
    // Vérifier si on a toutes les ressources
    for (const req of order.requirements) {
      if ((availableResources[req.resourceId] || 0) < req.quantity) {
        return { 
          success: false, 
          reward: 0, 
          message: `Pas assez de ${req.resourceId}: ${availableResources[req.resourceId] || 0}/${req.quantity}` 
        };
      }
    }
    
    // Vérifier si encore dans les délais pour le bonus
    const isOnTime = Date.now() < order.deadline;
    const totalReward = order.reward + (isOnTime ? order.bonus : 0);
    
    // Marquer comme complétée
    order.isCompleted = true;
    
    // Créer la transaction
    const transaction: Transaction = {
      id: `trans_${this.nextTransactionId++}`,
      resourceId: 'special_order',
      quantity: 1,
      unitPrice: totalReward,
      totalValue: totalReward,
      timestamp: Date.now(),
      type: 'order',
      orderId: orderId
    };
    
    this.transactions.push(transaction);
    this.transactionsSubject.next([...this.transactions]);
    this.specialOrdersSubject.next([...this.specialOrders]);
    
    // Générer une nouvelle commande
    setTimeout(() => {
      this.generateSpecialOrder();
    }, 10000); // 10 secondes plus tard
    
    this.saveToStorage();
    
    return {
      success: true,
      reward: totalReward,
      message: isOnTime ? 'Commande livrée à temps ! Bonus inclus !' : 'Commande livrée (en retard)'
    };
  }

  // Nettoyer les commandes expirées
  cleanupExpiredOrders(): void {
    const now = Date.now();
    this.specialOrders.forEach(order => {
      if (!order.isCompleted && now > order.deadline) {
        order.isExpired = true;
      }
    });
    
    // Supprimer les très anciennes commandes
    this.specialOrders = this.specialOrders.filter(order => 
      !order.isExpired || (now - order.deadline) < (24 * 60 * 60 * 1000) // Garder 24h
    );
    
    this.specialOrdersSubject.next([...this.specialOrders]);
    this.saveToStorage();
  }

  // Sauvegarde et chargement
  private saveToStorage(): void {
    const data = {
      marketPrices: this.marketPrices,
      specialOrders: this.specialOrders,
      transactions: this.transactions,
      nextOrderId: this.nextOrderId,
      nextTransactionId: this.nextTransactionId
    };
    localStorage.setItem('factoquest_market', JSON.stringify(data));
  }

  private loadFromStorage(): void {
    const saved = localStorage.getItem('factoquest_market');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.marketPrices = data.marketPrices || this.marketPrices;
        this.specialOrders = data.specialOrders || [];
        this.transactions = data.transactions || [];
        this.nextOrderId = data.nextOrderId || 1;
        this.nextTransactionId = data.nextTransactionId || 1;
        
        this.marketPricesSubject.next([...this.marketPrices]);
        this.specialOrdersSubject.next([...this.specialOrders]);
        this.transactionsSubject.next([...this.transactions]);
        
        // Nettoyer les commandes expirées au chargement
        this.cleanupExpiredOrders();
      } catch (error) {
        console.error('Erreur lors du chargement du marché:', error);
      }
    }
  }

  // Reset pour debug
  reset(): void {
    this.marketPrices = [];
    this.specialOrders = [];
    this.transactions = [];
    this.nextOrderId = 1;
    this.nextTransactionId = 1;
    
    this.initializeMarket();
    this.generateInitialOrders();
    this.saveToStorage();
  }
}