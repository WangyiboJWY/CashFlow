
import { Category, TransactionType } from './types';
import { 
  Utensils, Car, ShoppingBag, Home, Film, 
  Stethoscope, Banknote, TrendingUp, MoreHorizontal,
  // Habit Icons
  GlassWater, BookOpen, Dumbbell, BedDouble, Sun, Moon, 
  Code, Gamepad2, Music, Coffee, Cigarette, Smile, CheckCircle
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

// --- Habit Constants ---

export const HABIT_ICONS: Record<string, any> = {
  'water': GlassWater,
  'book': BookOpen,
  'gym': Dumbbell,
  'sleep': BedDouble,
  'sun': Sun,
  'moon': Moon,
  'code': Code,
  'game': Gamepad2,
  'music': Music,
  'coffee': Coffee,
  'no-smoking': Cigarette,
  'smile': Smile,
  'check': CheckCircle
};

export const HABIT_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Mint
  '#FFEEAD', // Yellow
  '#FF9F43', // Orange
  '#A29BFE', // Purple
  '#74B9FF', // Light Blue
  '#55E6C1', // Light Green
  '#FAB1A0', // Peach
];

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
export const APP_HABITS_KEY = 'cashflow_habits_v1';
export const APP_ONBOARDING_KEY = 'cashflow_onboarding_completed_v1';

export const MAX_SUB_CATEGORIES_PER_MAIN = 3;
export const MAX_TOTAL_CUSTOM_CATEGORIES = 10; // Total sub-categories allowed
export const MAX_CUSTOM_MAIN_CATEGORIES = 10; // Max custom main categories per type
