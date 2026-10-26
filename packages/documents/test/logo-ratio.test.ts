import { describe, expect, it } from 'vitest';
import { logoRatio } from '../src/templates/shared';

/** Logos are PNG, JPEG or WebP (the upload refuses anything else); templates shape a wide one differently. */

const url = (type: string, bytes: number[]) =>
  `data:${type};base64,${Buffer.from(Uint8Array.from(bytes)).toString('base64')}`;
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const be16 = (n: number) => [(n >>> 8) & 255, n & 255];
const le24 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];
const le16 = (n: number) => [n & 255, (n >>> 8) & 255];
const le32 = (n: number) => [...le16(n & 0xffff), ...le16(n >>> 16)];
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

const zeros = (n: number) => new Array<number>(n).fill(0);
const riff = (chunk: string) => [...ascii('RIFF'), ...zeros(4), ...ascii('WEBP'), ...ascii(chunk)];

function png(width: number, height: number) {
  const signature = [0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a];
  return url('image/png', [
    ...signature,
    ...be32(13),
    ...ascii('IHDR'),
    ...be32(width),
    ...be32(height),
    8,
    6,
    ...zeros(3),
  ]);
}

function jpeg(width: number, height: number) {
  const app0 = [0xff, 0xe0, ...be16(16), ...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const components = [1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  const sof0 = [0xff, 0xc0, ...be16(17), 8, ...be16(height), ...be16(width), 3, ...components];
  return url('image/jpeg', [0xff, 0xd8, ...app0, ...sof0, 0xff, 0xd9]);
}

function webpExtended(width: number, height: number) {
  return url('image/webp', [
    ...riff('VP8X'),
    10,
    ...zeros(3),
    0x10,
    ...zeros(3),
    ...le24(width - 1),
    ...le24(height - 1),
  ]);
}

function webpLossless(width: number, height: number) {
  const bits = (width - 1) | ((height - 1) << 14);
  return url('image/webp', [...riff('VP8L'), 5, ...zeros(3), 0x2f, ...le32(bits)]);
}

function webpLossy(width: number, height: number) {
  const frame = [0x9d, 0x01, 0x2a, ...le16(width & 0x3fff), ...le16(height & 0x3fff)];
  return url('image/webp', [...riff('VP8 '), 10, ...zeros(3), ...zeros(3), ...frame]);
}

describe('the logo’s shape', () => {
  it('reads the width over the height of a PNG', () => {
    expect(logoRatio(png(800, 200))).toBe(4);
    expect(logoRatio(png(300, 300))).toBe(1);
  });

  it('reads a JPEG’s frame after the segments before it', () => {
    expect(logoRatio(jpeg(1200, 400))).toBe(3);
  });

  it('reads the three kinds of WebP', () => {
    expect(logoRatio(webpExtended(1000, 250))).toBe(4);
    expect(logoRatio(webpLossless(600, 300))).toBe(2);
    expect(logoRatio(webpLossy(500, 500))).toBe(1);
  });

  it('is null with no logo, or one it cannot read', () => {
    expect(logoRatio(null)).toBeNull();
    expect(logoRatio('data:image/png;base64,AAAA')).toBeNull();
    expect(logoRatio('data:image/svg+xml;base64,PHN2Zy8+')).toBeNull();
    expect(logoRatio('https://example.com/logo.png')).toBeNull();
    expect(logoRatio(png(0, 0))).toBeNull();
  });
});
