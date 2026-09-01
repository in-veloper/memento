// 아이콘이 크림색 종이라, 앱도 종이 위에 쓰는 느낌으로 간다.
export const colors = {
  bg: '#E7E2D6',
  surface: '#FBF9F4',
  surfaceHigh: '#E6E1D5',
  border: 'rgba(22, 48, 43, 0.12)',
  borderStrong: 'rgba(22, 48, 43, 0.24)',

  text: '#16302B',
  textDim: '#5A6E68',
  textFaint: '#8B9B95',

  accent: '#1F4A42',
  accentSoft: '#2F7A6B',
  onAccent: '#F7F4ED',

  paper: '#FFFEFA',
  paperEdge: '#DED8CA',
  paperInk: '#16302B',
  paperDim: '#8B9B95',

  again: '#C2544B',
  hard: '#B07D2A',
  good: '#1F6E5B',
  danger: '#C2544B',
};

export const gradient = ['#2F7A6B', '#1F4A42'];

// Pretendard. 굵기별로 별도 파일이라 fontWeight 대신 패밀리로 지정한다.
export const font = {
  regular: 'Pretendard-Regular',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const label = {
  fontFamily: font.bold,
  fontSize: 11,
  letterSpacing: 1.4,
  color: colors.textFaint,
};
