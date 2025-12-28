
export enum TransactionType {
  EXPENSE = 'expense',
  INCOME = 'income'
}

export enum Category {
  FOOD = '餐饮',
  TRANSPORT = '交通',
  SHOPPING = '购物',
  HOUSING = '居住',
  ENTERTAINMENT = '娱乐',
  MEDICAL = '医疗',
  SALARY = '工资',
  INVESTMENT = '理财',
  OTHER = '其他'
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string; // Format: "Main" or "Main - Sub"
  date: string; // ISO String
  note: string;
  createdAt: number;
}

export interface TransactionTemplate {
  id: string;
  name: string; // Usually same as note or category
  amount: number;
  type: TransactionType;
  category: string;
  note: string;
}

export interface SummaryStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
}

export type CustomCategoryMap = Record<string, string[]>; // Main -> Sub[]

export type CustomMainCategoryMap = Record<TransactionType, string[]>; // Type -> Main[]

// --- Habit Types ---

export type HabitPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface Habit {
  id: string;
  name: string;
  icon: string; // Key for icon map
  color: string;
  targetCount: number; // e.g. 8 glasses of water
  period: HabitPeriod;
  customInterval?: number; // In days, used when period is 'custom'
  allowExceed?: boolean; // If true, can log more than target count
  logs: number[]; // Array of timestamps (ms) when action occurred
  createdAt: number;
  archived?: boolean; // Soft delete
}
