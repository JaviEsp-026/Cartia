export interface InventoryItem {
  id: string;
  userId: string;
  name: string;
  category: string;
  currentLevel: number; // 0-100
  unit: string;
  usageRate: number; // units per day
  lastStocked: string; // ISO date
  predictedExhaustionDate: string; // ISO date
  tags?: string[];
}

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  collaborators: string[];
}

export interface ShoppingItem {
  id: string;
  listId: string;
  inventoryItemId?: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  addedAt: string;
}

export interface Receipt {
  id: string;
  userId: string;
  store: string;
  date: string;
  totalAmount: number;
  items: { name: string; price: number }[];
}
