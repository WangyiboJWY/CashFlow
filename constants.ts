
import { Category, TransactionType } from './types';
import { 
  Utensils, Car, ShoppingBag, Home, Film, 
  Stethoscope, Banknote, TrendingUp, MoreHorizontal 
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, any> = {
  [Category.FOOD]: Utensils,
  [Category.TRANSPORT]: Car,
  [Category.SHOPPING]: ShoppingBag,
  [Category.HOUSING]: Home,
  [Category.ENTERTAINMENT]: Film,
  [Category.MEDICAL]: Stethoscope,
  [Category.SALARY]: Banknote,
  [Category.INVESTMENT]: TrendingUp,
  [Category.OTHER]: MoreHorizontal,
};

export const CATEGORY_COLORS: Record<string, string> = {
  [Category.FOOD]: '#FF6B6B',
  [Category.TRANSPORT]: '#4ECDC4',
  [Category.SHOPPING]: '#45B7D1',
  [Category.HOUSING]: '#96CEB4',
  [Category.ENTERTAINMENT]: '#FFEEAD',
  [Category.MEDICAL]: '#FF9F43',
  [Category.SALARY]: '#2ECC71',
  [Category.INVESTMENT]: '#3498DB',
  [Category.OTHER]: '#95A5A6',
};

export const EXPENSE_CATEGORIES = [
  Category.FOOD,
  Category.TRANSPORT,
  Category.SHOPPING,
  Category.HOUSING,
  Category.ENTERTAINMENT,
  Category.MEDICAL,
  Category.OTHER,
];

export const INCOME_CATEGORIES = [
  Category.SALARY,
  Category.INVESTMENT,
  Category.OTHER,
];

export const APP_STORAGE_KEY = 'cashflow_ai_data_v1';
export const APP_TEMPLATES_KEY = 'cashflow_ai_templates_v1';
export const APP_CUSTOM_CATEGORIES_KEY = 'cashflow_ai_custom_cats_v1';
export const APP_CUSTOM_MAIN_CATS_KEY = 'cashflow_ai_custom_main_cats_v1';
export const APP_ONBOARDING_KEY = 'cashflow_onboarding_completed_v1';

export const MAX_SUB_CATEGORIES_PER_MAIN = 3;
export const MAX_TOTAL_CUSTOM_CATEGORIES = 10; // Total sub-categories allowed
export const MAX_CUSTOM_MAIN_CATEGORIES = 10; // Max custom main categories per type
