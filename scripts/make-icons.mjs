import sharp from 'sharp';
import path from 'node:path';

// 원본은 짙은 남색 카드 위에 흰 암기 카드 묶음과 노란 반짝임이 얹힌 그림이다.
// 카드의 둥근 테두리를 그대로 넣으면 아이콘 안에 아이콘이 또 있는 꼴이 되고,
// 카드 바탕이 위아래로 밝기가 달라(위 luma 46, 아래 18) 단색 배경에 얹으면 자국이 남는다.
// 그래서 내용만 파내고, 카드와 같은 기울기의 세로 그라데이션을 배경으로 깐다.
const SRC = process.argv[2];
const OUT = process.argv[3];
const SIZE = 1024;
const SAFE = Math.round(SIZE * Number(process.argv[4] || 0.56));

const img = sharp(SRC).flatten({ background: '#ffffff' }).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const at = (x, y) => {
  const i = (y * W + x) * C;
  return [data[i], data[i + 1], data[i + 2]];
};
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// 카드는 어두운 영역이다. 줄마다 어두운 픽셀의 좌우 끝을 찾아 카드 범위를 잡는다.
// 둥근 모서리 바깥의 흰 여백은 이 범위에서 저절로 빠진다.
const DARK = 120;
const cardSpan = [];
let cardLeft = W;
let cardRight = 0;
let cardTop = H;
let cardBottom = 0;

for (let y = 0; y < H; y += 1) {
  let a = -1;
  let b = -1;
  for (let x = 0; x < W; x += 1) {
    const [r, g, bl] = at(x, y);
    if (luma(r, g, bl) >= DARK) continue;
    if (a < 0) a = x;
    b = x;
  }
  cardSpan[y] = a < 0 ? null : [a, b];
  if (a < 0) continue;
  if (a < cardLeft) cardLeft = a;
  if (b > cardRight) cardRight = b;
  if (y < cardTop) cardTop = y;
  if (y > cardBottom) cardBottom = y;
}

// 카드 안쪽의 밝은 부분(흰 카드 묶음, 노란 반짝임)이 내용이다.
const MARGIN = 8;
const MIN_INK_PER_ROW = 12;
const rows = [];
for (let y = cardTop; y <= cardBottom; y += 1) {
  const span = cardSpan[y];
  if (!span) continue;

  let n = 0;
  let a = W;
  let b = 0;
  for (let x = span[0] + MARGIN; x <= span[1] - MARGIN; x += 1) {
    const [r, g, bl] = at(x, y);
    if (luma(r, g, bl) <= 95) continue;
    n += 1;
    if (x < a) a = x;
    if (x > b) b = x;
  }
  if (n >= MIN_INK_PER_ROW) rows.push({ y, a, b });
}

if (rows.length === 0) throw new Error('내용을 찾지 못했습니다.');

const top = rows[0].y;
const bottom = rows[rows.length - 1].y;
const left = Math.min(...rows.map((r) => r.a));
const right = Math.max(...rows.map((r) => r.b));

const crop = {
  left,
  top,
  width: right - left + 1,
  height: bottom - top + 1,
};

// 배경 그라데이션은 카드 위/아래 바탕색을 그대로 읽어 만든다.
// 좌우 끝은 둥근 모서리라 카드 바깥이 찍힐 수 있으므로 카드 한가운데 세로선에서,
// 내용의 위쪽 여백과 아래쪽 여백을 찍는다.
const bgColumn = Math.round((cardLeft + cardRight) / 2);
const topBg = at(bgColumn, Math.round((cardTop + top) / 2));
const bottomBg = at(bgColumn, Math.round((bottom + cardBottom) / 2));
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

const background = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
     <defs>
       <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="${rgb(topBg)}"/>
         <stop offset="1" stop-color="${rgb(bottomBg)}"/>
       </linearGradient>
     </defs>
     <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
   </svg>`
);

await sharp(background).png().toFile(path.join(OUT, 'android-icon-background.png'));

// 내용 조각에서 어두운 바탕을 파낸다.
// 테두리에서 이어진 어두운 색만 따라가므로, 흰 카드 안의 어두운 뇌 그림은 그대로 남는다.
const piece = await sharp(SRC)
  .flatten({ background: '#ffffff' })
  .extract(crop)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const pw = piece.info.width;
const ph = piece.info.height;
const pc = piece.info.channels;
const px = Buffer.from(piece.data);

// 명도만으로는 갈리지 않는다. 실제로 재보면
//   반짝임 둘레의 빛 번짐 : 명도 66~110, 채도 24~35
//   파란 카드의 어두운 밑단: 명도 43,     채도 57
// 이라, 명도로 자르면 빛 번짐을 남기거나 카드 밑단을 뜯어먹는다.
// 배경과 빛 번짐은 채도가 낮고, 카드는 어두워도 채도가 높다는 점으로 가른다.
const BACKDROP_SAT = 48;
const BACKDROP_LUMA = 115;
const isBackdrop = (i) => {
  const r = px[i];
  const g = px[i + 1];
  const b = px[i + 2];
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return sat < BACKDROP_SAT && luma(r, g, b) < BACKDROP_LUMA;
};

const visited = new Uint8Array(pw * ph);
const queue = [];

const push = (x, y) => {
  if (x < 0 || y < 0 || x >= pw || y >= ph) return;
  const p = y * pw + x;
  if (visited[p]) return;
  if (!isBackdrop(p * pc)) return;
  visited[p] = 1;
  queue.push(p);
};

for (let x = 0; x < pw; x += 1) {
  push(x, 0);
  push(x, ph - 1);
}
for (let y = 0; y < ph; y += 1) {
  push(0, y);
  push(pw - 1, y);
}

while (queue.length) {
  const p = queue.pop();
  const x = p % pw;
  const y = (p - x) / pw;

  px[p * pc + 3] = 0;

  push(x + 1, y);
  push(x - 1, y);
  push(x, y + 1);
  push(x, y - 1);
}

// 지운 자리에 남는 어두운 테두리를 한 겹 부드럽게 깎는다.
for (let y = 1; y < ph - 1; y += 1) {
  for (let x = 1; x < pw - 1; x += 1) {
    const p = y * pw + x;
    if (px[p * pc + 3] === 0) continue;
    if (!isBackdrop(p * pc)) continue;

    const touching =
      visited[p - 1] || visited[p + 1] || visited[p - pw] || visited[p + pw];
    if (touching) px[p * pc + 3] = 90;
  }
}

// 테두리 상자를 캔버스 한가운데 두면 눈에는 치우쳐 보인다.
// 오른쪽 위로 뻗은 반짝임이 상자를 늘려서, 정작 무거운 카드 묶음이
// 반대쪽으로 밀리기 때문이다(실측 24px). 그래서 상자가 아니라
// 알파를 가중치로 한 무게중심을 한가운데에 맞춘다.
let massSumX = 0;
let massSumY = 0;
let massWeight = 0;
for (let y = 0; y < ph; y += 1) {
  for (let x = 0; x < pw; x += 1) {
    const a = px[(y * pw + x) * pc + 3];
    if (a < 20) continue;
    massSumX += x * a;
    massSumY += y * a;
    massWeight += a;
  }
}
const massX = massSumX / massWeight;
const massY = massSumY / massWeight;

const onCanvas = (input, opts = {}) =>
  sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input, ...opts }])
    .png();

// 긴 변이 targetLong 이 되도록 줄인 뒤, 무게중심이 캔버스 한가운데 오도록 놓는다.
async function placeByMass(source, channels, targetLong) {
  const k = targetLong / Math.max(pw, ph);
  const w = Math.max(1, Math.round(pw * k));
  const h = Math.max(1, Math.round(ph * k));

  const scaled = await sharp(source, { raw: { width: pw, height: ph, channels } })
    .resize(w, h)
    .png()
    .toBuffer();

  return {
    input: scaled,
    left: Math.max(0, Math.min(SIZE - w, Math.round(SIZE / 2 - massX * k))),
    top: Math.max(0, Math.min(SIZE - h, Math.round(SIZE / 2 - massY * k))),
  };
}

const placedContent = await placeByMass(px, pc, SAFE);
await onCanvas(placedContent.input, { left: placedContent.left, top: placedContent.top }).toFile(
  path.join(OUT, 'android-icon-foreground.png')
);

// 테마 아이콘 — 파낸 조각의 모양 그대로 흰 실루엣으로 만든다.
const mono = Buffer.alloc(pw * ph * 4);
for (let i = 0; i < pw * ph; i += 1) {
  const src = i * pc;
  const dst = i * 4;
  mono[dst] = 255;
  mono[dst + 1] = 255;
  mono[dst + 2] = 255;
  mono[dst + 3] = px[src + 3];
}

const placedMono = await placeByMass(mono, 4, SAFE);
await onCanvas(placedMono.input, { left: placedMono.left, top: placedMono.top }).toFile(
  path.join(OUT, 'android-icon-monochrome.png')
);

// 마스크가 없는 자리에서는 조금 더 꽉 채운다.
const placedWide = await placeByMass(px, pc, Math.round(SIZE * 0.76));
const full = await sharp(background)
  .composite([{ input: placedWide.input, left: placedWide.left, top: placedWide.top }])
  .png()
  .toBuffer();
await sharp(full).toFile(path.join(OUT, 'icon.png'));
await sharp(full).toFile(path.join(OUT, 'adaptive-icon.png'));

const small = await sharp(full).resize(460).png().toBuffer();
await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: { ...{ r: topBg[0], g: topBg[1], b: topBg[2] }, alpha: 1 } },
})
  .composite([{ input: small }])
  .png()
  .toFile(path.join(OUT, 'splash-icon.png'));

console.log('카드      :', { left: cardLeft, top: cardTop, w: cardRight - cardLeft + 1, h: cardBottom - cardTop + 1 });
console.log('내용 bbox :', crop);
console.log('배경      :', rgb(topBg), '->', rgb(bottomBg));
console.log('SAFE      :', SAFE, `(${(SAFE / SIZE).toFixed(2)})`);
