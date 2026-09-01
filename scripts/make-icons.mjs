import sharp from 'sharp';
import path from 'node:path';

const SRC = process.argv[2];
const OUT = process.argv[3];
const SIZE = 1024;

// 빛나는 카드가 캔버스에서 차지할 비율.
// 마스크는 가운데 66% 만 보여주므로, 실제로 보이는 영역 기준으로는 이 값의 1.5 배가 된다.
const CARD_RATIO = 0.38;
const BRIGHT = 150;

const img = sharp(SRC).ensureAlpha();
const meta = await img.metadata();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

const at = (x, y) => {
  const i = (y * W + x) * C;
  return [data[i], data[i + 1], data[i + 2]];
};
const luma = (p) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];

// 아이콘 사각형은 배경과 밝기 차이가 10 남짓이라 경계를 가를 수 없다.
// 대신 확실하게 밝은 "카드"를 찾는다. 아래 글자(Memento)는 획이 얇아
// 한 행에서 이어지는 길이가 짧으므로 길이 조건으로 걸러진다.
function longestBrightRun(y) {
  let best = { length: 0, start: -1, end: -1 };
  let start = -1;

  for (let x = 0; x < W; x += 1) {
    const bright = luma(at(x, y)) > BRIGHT;
    if (bright && start < 0) start = x;

    if ((!bright || x === W - 1) && start >= 0) {
      const end = bright ? x : x - 1;
      const length = end - start + 1;
      if (length > best.length) best = { length, start, end };
      start = -1;
    }
  }

  return best;
}

// 조건을 만족하는 행을 연속된 덩어리로 묶는다.
// 카드와 아래 글자 사이에는 빈 줄이 있어 서로 다른 덩어리가 되고, 큰 쪽이 카드다.
const rows = [];
for (let y = 0; y < H; y += 1) {
  const run = longestBrightRun(y);
  if (run.length >= W * 0.15) rows.push({ y, ...run });
}

if (!rows.length) throw new Error('빛나는 카드 영역을 찾지 못했습니다.');

const bands = [];
let current = [rows[0]];

for (let i = 1; i < rows.length; i += 1) {
  if (rows[i].y - rows[i - 1].y <= 4) {
    current.push(rows[i]);
  } else {
    bands.push(current);
    current = [rows[i]];
  }
}
bands.push(current);

const band = bands.reduce((a, b) => (b.length > a.length ? b : a));

const top = band[0].y;
const bottom = band[band.length - 1].y;
const left = Math.min(...band.map((r) => r.start));
const right = Math.max(...band.map((r) => r.end));

const cardW = right - left + 1;
const cardH = bottom - top + 1;
const cardSide = Math.max(cardW, cardH);
const cx = (left + right) / 2;
const cy = (top + bottom) / 2;

// 카드를 중심으로 잘라낼 정사각형. 이미지 밖으로 나가지 않게 줄인다.
const wanted = Math.round(cardSide / CARD_RATIO);
const side = Math.min(
  wanted,
  Math.floor(Math.min(cx, W - cx, cy, H - cy) * 2)
);

const crop = {
  left: Math.round(cx - side / 2),
  top: Math.round(cy - side / 2),
  width: side,
  height: side,
};

// 카드 바로 바깥의 어두운 부분에서 배경색을 뽑는다.
// 아이콘 네 귀퉁이가 아니라 카드 주변이라, 마스크가 잘라낸 자리와 색이 이어진다.
function samplePatch(px, py) {
  const half = Math.round(cardSide * 0.04);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;

  for (let y = py - half; y <= py + half; y += 2) {
    for (let x = px - half; x <= px + half; x += 2) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const p = at(x, y);
      if (luma(p) > BRIGHT) continue; // 카드 자체는 제외
      r += p[0];
      g += p[1];
      b += p[2];
      n += 1;
    }
  }

  if (!n) return '#1d1d24';
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// 카드는 투명하게 오려 붙이므로 배경은 원본의 분위기만 따라가면 된다.
// 왼쪽 위의 짙은 회색과 오른쪽 아래의 보랏빛을 그대로 가져온다.
const clampX = (v) => Math.max(2, Math.min(W - 3, Math.round(v)));
const clampY = (v) => Math.max(2, Math.min(H - 3, Math.round(v)));

const cTop = samplePatch(
  clampX(left - cardW * 0.35),
  clampY(top - cardH * 0.22)
);
const cBottom = samplePatch(
  clampX(right + cardW * 0.28),
  clampY(bottom + cardH * 0.1)
);

const backgroundSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
     <defs>
       <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0%" stop-color="${cTop}"/>
         <stop offset="100%" stop-color="${cBottom}"/>
       </linearGradient>
     </defs>
     <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
   </svg>`
);

await sharp(backgroundSvg)
  .png()
  .toFile(path.join(OUT, 'android-icon-background.png'));

// 잘라낸 사각형을 그대로 얹으면 그림 가장자리와 배경이 만나는 선이 보인다.
// 그래서 카드와 광채만 밝기로 뽑아내고 나머지는 투명하게 만든다.
// 광채가 부드럽게 사라지는 만큼 알파도 부드럽게 빠져서 이음매가 생기지 않는다.
const scaled = Math.round((SIZE * CARD_RATIO * side) / cardSide);

const cut = await sharp(SRC)
  .extract(crop)
  .raw()
  .toBuffer({ resolveWithObject: true });

const cutPixels = Buffer.alloc(side * side * 4);
for (let i = 0; i < side * side; i += 1) {
  const src = i * cut.info.channels;
  const dst = i * 4;
  const value =
    0.299 * cut.data[src] + 0.587 * cut.data[src + 1] + 0.114 * cut.data[src + 2];

  cutPixels[dst] = cut.data[src];
  cutPixels[dst + 1] = cut.data[src + 1];
  cutPixels[dst + 2] = cut.data[src + 2];
  cutPixels[dst + 3] = Math.max(0, Math.min(255, Math.round((value - 46) * 3.4)));
}

const artwork = await sharp(cutPixels, {
  raw: { width: side, height: side, channels: 4 },
})
  .resize(scaled, scaled, { fit: 'cover' })
  .png()
  .toBuffer();

const onCanvas = (input, opts = {}) =>
  sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input, gravity: 'center', ...opts }])
    .png();

await onCanvas(artwork).toFile(path.join(OUT, 'android-icon-foreground.png'));

// 테마 아이콘 — 빛나는 부분만 실루엣으로.
const mono = Buffer.alloc(side * side * 4);
for (let i = 0; i < side * side; i += 1) {
  const src = i * cut.info.channels;
  const dst = i * 4;
  const value =
    0.299 * cut.data[src] + 0.587 * cut.data[src + 1] + 0.114 * cut.data[src + 2];

  mono[dst] = 255;
  mono[dst + 1] = 255;
  mono[dst + 2] = 255;
  mono[dst + 3] = Math.max(0, Math.min(255, Math.round((value - 90) * 2.6)));
}

const monoScaled = await sharp(mono, { raw: { width: side, height: side, channels: 4 } })
  .resize(scaled, scaled, { fit: 'cover' })
  .png()
  .toBuffer();

await onCanvas(monoScaled).toFile(path.join(OUT, 'android-icon-monochrome.png'));

await sharp(backgroundSvg)
  .composite([{ input: await onCanvas(artwork).toBuffer() }])
  .png()
  .toFile(path.join(OUT, 'icon.png'));

console.log('source    :', `${meta.width}x${meta.height}`);
console.log('card bbox :', { left, top, width: cardW, height: cardH });
console.log('crop      :', crop, '-> scaled', scaled);
console.log('gradient  :', cTop, '->', cBottom);
console.log('written   :', OUT);
