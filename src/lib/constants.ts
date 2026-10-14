import type { ModuleName } from '@/types';

export const MODULE_LABELS: Record<ModuleName, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  indicators: 'Indicators',
  activities: 'Activities',
  beneficiaries: 'Beneficiaries',
  districts: 'Districts',
  users: 'User Management',
  branding: 'Branding',
  schema_generator: 'Schema Generator',
  database_explorer: 'Database Explorer',
  kobo: 'KoboToolbox',
  reports: 'Reports',
  theme: 'Theme Configurator',
};

export const ALL_MODULES: ModuleName[] = [
  'dashboard',
  'projects',
  'indicators',
  'activities',
  'beneficiaries',
  'districts',
  'users',
  'branding',
  'schema_generator',
  'database_explorer',
  'kobo',
  'reports',
  'theme',
];

interface StatusStyle {
  bg: string;
  text: string;
  dot: string;
  label: string;
}

export const STATUS_COLORS: Record<string, StatusStyle> = {
  planned: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', label: 'Planned' },
  ongoing: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Ongoing' },
  delayed: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Delayed' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Completed' },
};

export const PROJECT_STATUS_OPTIONS = ['planned', 'ongoing', 'delayed', 'completed'] as const;
export const ACTIVITY_STATUS_OPTIONS = ['planned', 'ongoing', 'delayed', 'completed'] as const;
export const INDICATOR_CATEGORIES = ['output', 'outcome', 'impact'] as const;
export const DISAGGREGATION_TYPES = ['none', 'gender', 'district', 'disability', 'age'] as const;

export const CURRENCIES = [
  { code: 'MZN', label: 'Meticais (MZN)', symbol: 'MT' },
  { code: 'USD', label: 'US Dollar (USD)', symbol: '$' },
  { code: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { code: 'CNY', label: 'Chinese Yuan (CNY)', symbol: '¥' },
] as const;

export const ACTIVITY_TYPES = [
  { value: 'training', label: 'Training (Treinamento)' },
  { value: 'advocacy', label: 'Advocacy (Advocacia)' },
  { value: 'safeguarding', label: 'Safeguarding (Salvaguarda)' },
  { value: 'mobilization', label: 'Community Mobilization (Mobilização)' },
  { value: 'case_finding', label: 'Active Case Finding (Rastreio Activo)' },
  { value: 'nutrition', label: 'Nutrition Screening' },
  { value: 'supply_chain', label: 'Supply Chain Log' },
  { value: 'other', label: 'Other' },
] as const;

export const ACTIVITY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPES.map((t) => [t.value, t.label])
);

export const MOZAMBIQUE_PROVINCES: Record<string, string[]> = {
  'Niassa': [],
  'Cabo Delgado': [],
  'Nampula': [],
  'Zambézia': [],
  'Tete': [],
  'Manica': [],
  'Sofala': [],
  'Inhambane': [],
  'Gaza': [],
  'Maputo Província': [],
  'Maputo Cidade': [],
};

export const PROVINCE_NAMES = Object.keys(MOZAMBIQUE_PROVINCES);

export function formatCurrency(amount: number, currency: string): string {
  const cur = CURRENCIES.find((c) => c.code === currency);
  const symbol = cur?.symbol ?? '';
  const formatted = new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol} ${formatted}`;
}

export function formatMZN(amount: number): string {
  return formatCurrency(amount, 'MZN');
}

export function convertToMZN(amount: number, currency: string, exchangeRate: number): number {
  if (currency === 'MZN') return amount;
  return amount * exchangeRate;
}
