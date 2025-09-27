import { Injectable } from '@angular/core';
import { Recipe, Resource } from '../models/game.model';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {

  private resources: Resource[] = [
    { id: 'iron_ore', name: 'Minerai de fer', icon: '⚪' },
    { id: 'copper_ore', name: 'Minerai de cuivre', icon: '🟤' },
    { id: 'coal', name: 'Charbon', icon: '⚫' },
    { id: 'gold_ore', name: 'Minerai d\'or', icon: '🟡' },
    { id: 'silver_ore', name: 'Minerai d\'argent', icon: '⚪' },
    { id: 'iron_plate', name: 'Plaque de fer', icon: '🔹' },
    { id: 'copper_plate', name: 'Plaque de cuivre', icon: '🟠' },
    { id: 'silver_plate', name: 'Plaque d\'argent', icon: '🔘' },
    { id: 'gold_plate', name: 'Plaque d\'or', icon: '🟡' },
    { id: 'iron_wire', name: 'Fil de fer', icon: '🔗' },
    { id: 'gear', name: 'Engrenage', icon: '⚙️' }
  ];

  private recipes: Recipe[] = [
    // Mines
    {
      id: 'mine_iron',
      name: 'Extraction fer',
      inputs: [],
      outputs: [{ resourceId: 'iron_ore', quantity: 1 }],
      duration: 1,
      machineType: 'mine'
    },
    {
      id: 'mine_copper',
      name: 'Extraction cuivre',
      inputs: [],
      outputs: [{ resourceId: 'copper_ore', quantity: 1 }],
      duration: 1.5,
      machineType: 'mine'
    },
    {
      id: 'mine_coal',
      name: 'Extraction charbon',
      inputs: [],
      outputs: [{ resourceId: 'coal', quantity: 1 }],
      duration: 0.8,
      machineType: 'mine'
    },
    {
      id: 'mine_gold',
      name: 'Extraction or',
      inputs: [],
      outputs: [{ resourceId: 'gold_ore', quantity: 1 }],
      duration: 1.2,
      machineType: 'mine'
    },
    {
      id: 'mine_silver',
      name: 'Extraction argent',
      inputs: [],
      outputs: [{ resourceId: 'silver_ore', quantity: 1 }],
      duration: 1.5,
      machineType: 'mine'
    },

    // Fours
    {
      id: 'smelt_iron',
      name: 'Fonte fer',
      inputs: [
        { resourceId: 'iron_ore', quantity: 3 },
        { resourceId: 'coal', quantity: 1 }
      ],
      outputs: [{ resourceId: 'iron_plate', quantity: 1 }],
      duration: 3,
      machineType: 'furnace'
    },
    {
      id: 'smelt_copper',
      name: 'Fonte cuivre',
      inputs: [
        { resourceId: 'copper_ore', quantity: 2 },
        { resourceId: 'coal', quantity: 1 }
      ],
      outputs: [{ resourceId: 'copper_plate', quantity: 1 }],
      duration: 2.5,
      machineType: 'furnace'
    },

    { id: 'smelt_silver', name: 'Fonte argent', inputs: [
        { resourceId: 'silver_ore', quantity: 3 },
        { resourceId: 'coal', quantity: 1 }
      ],
      outputs: [{ resourceId: 'silver_plate', quantity: 1 }],
      duration: 3,
      machineType: 'furnace'
    },

    { id: 'smelt_gold', name: 'Fonte or', inputs: [
        { resourceId: 'gold_ore', quantity: 3 },
        { resourceId: 'coal', quantity: 1 }
      ],
      outputs: [{ resourceId: 'gold_plate', quantity: 1 }],
      duration: 3,
      machineType: 'furnace'
    },

    // Assembleurs
    {
      id: 'craft_wire',
      name: 'Fabrication fil',
      inputs: [{ resourceId: 'iron_plate', quantity: 2 }],
      outputs: [{ resourceId: 'iron_wire', quantity: 1 }],
      duration: 5,
      machineType: 'assembler'
    },
    {
      id: 'craft_gear',
      name: 'Fabrication engrenage',
      inputs: [
        { resourceId: 'iron_plate', quantity: 2 },
        { resourceId: 'iron_wire', quantity: 1 }
      ],
      outputs: [{ resourceId: 'gear', quantity: 1 }],
      duration: 8,
      machineType: 'assembler'
    }
  ];

  getResources(): Resource[] {
    return [...this.resources];
  }

  getResource(id: string): Resource | undefined {
    return this.resources.find(r => r.id === id);
  }

  getRecipes(): Recipe[] {
    return [...this.recipes];
  }

  getRecipesByMachineType(machineType: 'mine' | 'furnace' | 'assembler'): Recipe[] {
    return this.recipes.filter(r => r.machineType === machineType);
  }

  getRecipe(id: string): Recipe | undefined {
    return this.recipes.find(r => r.id === id);
  }
  
}
