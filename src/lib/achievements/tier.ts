import type { AchievementTier } from './types';

export interface TierStyle {
  primary: string;
  secondary: string;
  glow: string;
  textOnPrimary: string;
  label: string;
  badge: string;
  particles: number;
  palette: string[];
  isGradient: boolean;
}

export const TIER_STYLES: Record<AchievementTier, TierStyle> = {
  bronze: {
    primary: '#CD7F32',
    secondary: '#8B5A2B',
    glow: '#CD7F3266',
    textOnPrimary: '#FFFFFF',
    label: 'Bronze',
    badge: '🥉',
    particles: 50,
    palette: ['#CD7F32', '#B87333', '#A0522D', '#FFB07A'],
    isGradient: false,
  },
  silver: {
    primary: '#C0C0C0',
    secondary: '#7A7A7A',
    glow: '#C0C0C066',
    textOnPrimary: '#0A0E1A',
    label: 'Silber',
    badge: '🥈',
    particles: 80,
    palette: ['#C0C0C0', '#E5E5E5', '#A8A8A8', '#FFFFFF'],
    isGradient: false,
  },
  gold: {
    primary: '#FFD700',
    secondary: '#B8860B',
    glow: '#FFD70066',
    textOnPrimary: '#0A0E1A',
    label: 'Gold',
    badge: '🥇',
    particles: 120,
    palette: ['#FFD700', '#FFA500', '#FFFFFF', '#FFE066'],
    isGradient: false,
  },
  platinum: {
    primary: '#A78BFA',
    secondary: '#22D3EE',
    glow: '#A78BFA66',
    textOnPrimary: '#FFFFFF',
    label: 'Platin',
    badge: '💎',
    particles: 200,
    palette: ['#A78BFA', '#22D3EE', '#F472B6', '#34D399', '#FBBF24', '#60A5FA'],
    isGradient: true,
  },
  hidden: {
    primary: '#6D28D9',
    secondary: '#312E81',
    glow: '#A78BFA88',
    textOnPrimary: '#FFFFFF',
    label: 'Geheim',
    badge: '🔮',
    particles: 100,
    palette: ['#6D28D9', '#A78BFA', '#312E81', '#EC4899'],
    isGradient: true,
  },
  premium: {
    primary: '#FFD700',
    secondary: '#92400E',
    glow: '#FFD70077',
    textOnPrimary: '#0A0E1A',
    label: 'Premium',
    badge: '👑',
    particles: 150,
    palette: ['#FFD700', '#F59E0B', '#FFFFFF', '#FBBF24'],
    isGradient: true,
  },
};

export const tierStyle = (tier: AchievementTier | undefined): TierStyle =>
  TIER_STYLES[tier ?? 'bronze'];
