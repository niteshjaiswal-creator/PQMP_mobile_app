// Design tokens, taken from the "PQMP App Redesign" design (Claude artifact): Eicher red for
// identity, VECV navy for the primary action, Plus Jakarta Sans throughout.
// Keep accents sparse; most of the UI is ink on a cool grey canvas.

export const colors = {
  brand: '#C62828', // Eicher red
  brandTint: '#FDECEA',
  primary: '#1F4E8C', // VECV navy: primary buttons, links, focus
  primaryPressed: '#163A69',
  primaryDisabled: '#9AAED0',
  focusRing: '#E3ECF8',

  ink: '#141B2D',
  inkStrong: '#3A4357', // form labels
  inkMuted: '#5B6475',
  inkSubtle: '#8A93A6',

  paper: '#FFFFFF',
  canvas: '#F4F6FA',
  border: '#DDE3EE',
  borderFocus: '#1F4E8C',

  // Status accents (background tint + foreground), shared by chips, badges and timelines.
  info: '#1D4ED8',
  infoTint: '#E6EFFD',
  warning: '#865000',
  warningTint: '#FFF2D6',
  success: '#1B6B34',
  successTint: '#E2F4E7',

  assigned: '#5B21B6',
  assignedTint: '#EFEAFD',
  neutral: '#475569',
  neutralTint: '#ECEFF3',
  escalated: '#9A3412',
  escalatedTint: '#FFE9D9',
  rowTint: '#F7F9FD',
  divider: '#EEF1F6',
  track: '#E9EDF4',

  danger: '#B42318',
  dangerTint: '#FEF3F2',
  dangerBorder: '#FECDCA',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 18, hero: 36, pill: 999 } as const;

// One family per weight: Android can't pick weights of a custom font via fontWeight.
// Names match both the file names (Android) and the PostScript names (iOS).
export const fonts = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semibold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extrabold: 'PlusJakartaSans-ExtraBold',
} as const;

export const type = {
  hero: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 36, letterSpacing: -0.96 },
  display: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30, letterSpacing: -0.5 },
  title: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
};

export const APP_NAME = 'Parts Query Management Portal';
export const BRAND_NAME = 'Eicher Genuine Parts';
export const BRAND_TAGLINE = 'Support Experience Center';
