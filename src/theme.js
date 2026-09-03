// 아이콘의 짙은 남보라 바탕과 금빛 광채를 그대로 앱으로 가져온다.
export const colors = {
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

  // 채점 3단계. 앰버와 부딪히지 않게 서로 다른 계열로 잡았다.
  again: '#FF8A7A',
  hard: '#8FA8FF',
  good: '#5FD3A6',

  danger: '#FF8A7A',
};

export const gradient = ['#F8D693', '#E9A63B'];

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

export const label = {
  fontFamily: font.bold,
  fontSize: 11,
  letterSpacing: 1.6,
  color: colors.textFaint,
};
