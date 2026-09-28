// Pretendard. 굵기별로 별도 파일이라 fontWeight 대신 패밀리로 지정한다.
export const font = {
  regular: 'Pretendard-Regular',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const gradient = ['#F8D693', '#E9A63B'];

// 아이콘의 짙은 남보라 바탕과 금빛 광채를 그대로 앱으로 가져온 기본(어두운) 테마.
const dark = {
  bg: '#0D0F14',
  surface: '#161A22',
  surfaceHigh: '#1E232D',
  surfaceSoft: 'rgba(255, 255, 255, 0.04)',

  line: 'rgba(255, 255, 255, 0.07)',
  lineStrong: 'rgba(255, 255, 255, 0.15)',

  text: '#F2F4F7',
  textDim: '#98A2B1',
  textFaint: '#6A737F',

  accent: '#F0B849',
  accentSoft: '#F8D693',
  accentDim: 'rgba(240, 184, 73, 0.14)',
  accentLine: 'rgba(240, 184, 73, 0.34)',
  onAccent: '#1B1405',

  again: '#FF8A7A',
  hard: '#8FA8FF',
  good: '#5FD3A6',
  danger: '#FF8A7A',
};

// 낮에 봐도 눈부시지 않도록 만든 밝은 테마 — 어두운 테마와 같은 구도(배경/표면/글자/강조)를
// 유지하면서 명암만 뒤집는다. 금색 강조는 흰 바탕에서 그대로 쓰면 대비가 약해서 살짝 짙게 뺐다.
const light = {
  bg: '#F7F4EE',
  surface: '#FFFFFF',
  surfaceHigh: '#F0EBE0',
  surfaceSoft: 'rgba(30, 23, 8, 0.035)',

  line: 'rgba(30, 23, 8, 0.08)',
  lineStrong: 'rgba(30, 23, 8, 0.16)',

  text: '#241C10',
  textDim: '#6E6656',
  textFaint: '#978D7A',

  accent: '#B87B27',
  accentSoft: '#D89B45',
  accentDim: 'rgba(184, 123, 39, 0.12)',
  accentLine: 'rgba(184, 123, 39, 0.30)',
  onAccent: '#FFFCF6',

  again: '#DA5744',
  hard: '#3E63D6',
  good: '#1F9A70',
  danger: '#DA5744',
};

export const palettes = { dark, light };

// 아직 useColors() 로 옮기지 않은 코드가 있어도 깨지지 않도록 기본값(어두운 테마)을
// 그대로 남겨 둔다 — 새 코드는 항상 useColors()/useTheme() 를 써야 한다.
export const colors = dark;

export const label = {
  fontFamily: font.bold,
  fontSize: 11,
  letterSpacing: 1.6,
  color: dark.textFaint,
};
