import React from 'react';
import {
  ShoppingCart,
  Utensils,
  Coffee,
  Fuel,
  Bus,
  Scissors,
  Shirt,
  Home,
  Gamepad2,
  HeartPulse,
  Bike,
  Receipt,
  Landmark,
  Sparkles,
  Wallet,
  CreditCard,
  Building2,
  PiggyBank,
  TrendingUp,
  Coins,
  Car,
  ShieldCheck,
  Tv,
  PawPrint,
  GraduationCap,
  Laptop,
  Zap,
  FileText,
  Plane,
  Tag,
  LucideIcon,
} from 'lucide-react';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return dateStr;
};

export const formatDateRelative = (dateStr: string): string => {
  if (!dateStr) return '';
  const today = new Date().toISOString().substring(0, 10);
  if (dateStr === today) return 'Hoy';
  
  const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
  if (dateStr === yesterday) return 'Ayer';

  return formatDate(dateStr);
};

export const getCategoryIcon = (iconName: string): LucideIcon => {
  const map: Record<string, LucideIcon> = {
    ShoppingCart,
    Utensils,
    Coffee,
    Fuel,
    Bus,
    Scissors,
    Shirt,
    Home,
    Gamepad2,
    HeartPulse,
    Bike,
    Receipt,
    Landmark,
    Sparkles,
    Wallet,
    CreditCard,
    Building2,
    PiggyBank,
    TrendingUp,
    Coins,
    Car,
    ShieldCheck,
    Tv,
    PawPrint,
    GraduationCap,
    Laptop,
    Zap,
    FileText,
    Plane,
    Tag,
  };
  return map[iconName] || Receipt;
};

export const getAccountTypeIcon = (type: string): LucideIcon => {
  switch (type) {
    case 'banco':
      return Building2;
    case 'tarjeta':
      return CreditCard;
    case 'ahorro':
      return PiggyBank;
    case 'inversion':
      return TrendingUp;
    case 'efectivo':
    default:
      return Wallet;
  }
};
