// Design tokens from the "Friends design system" board.
export const colors = {
  bg: '#FFFFFF',
  surface: '#F7F8FD',
  surface2: '#EEF0FA',
  text: '#1B1B3A',
  muted: '#5F6488',
  blue: '#1877F2',
  blueDeep: '#0B5ED7',
  blueSoft: 'rgba(24,119,242,0.10)',
  blueBorder: 'rgba(24,119,242,0.55)',
  success: '#1FA971',
  warning: '#FFB84D',
  danger: '#E5384F',
  gold: '#FFD27A',
  border: 'rgba(27,27,58,0.08)',
  borderStrong: 'rgba(27,27,58,0.14)',
  // call screens
  night: '#0D1B3E',
  nightTop: '#14306B',
  nightBottom: '#0A1530',
  glass: 'rgba(255,255,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.22)',
  scrim: 'rgba(11,13,26,0.62)',
};

export const gradient = {
  accent: ['#1877F2', '#0B5ED7'] as const,
  premium: ['#FFC266', '#FF9F43'] as const,
  call: ['#1A3D82', '#0F2557', '#0A1633'] as const,
};

export const radius = { chip: 12, input: 18, button: 22, card: 24, sheet: 32 };
export const space = { screen: 24 };

export const font = {
  display: 'Poppins_700Bold',
  displaySemi: 'Poppins_600SemiBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
};

export const type = {
  display: { fontFamily: font.display, fontSize: 34, lineHeight: 40, color: colors.text },
  h1: { fontFamily: font.display, fontSize: 28, lineHeight: 34, color: colors.text },
  h2: { fontFamily: font.display, fontSize: 22, lineHeight: 28, color: colors.text },
  title: { fontFamily: font.displaySemi, fontSize: 18, lineHeight: 24, color: colors.text },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 24, color: colors.text },
  bodyStrong: { fontFamily: font.semi, fontSize: 15, lineHeight: 22, color: colors.text },
  caption: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: colors.muted },
  micro: { fontFamily: font.semi, fontSize: 12, lineHeight: 16, color: colors.muted },
} as const;

export const shadow = {
  card: { shadowColor: '#28305A', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 12 }, elevation: 4 },
  glow: { shadowColor: '#1877F2', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
};
