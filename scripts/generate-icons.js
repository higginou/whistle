/**
 * Generate PWA icons for Whistle.
 * Creates PNG icons with a stylized "W" whistle logo on violet background.
 * No external dependencies — uses raw PNG encoding with zlib.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "..", "public");

// Brand colors
const VIOLET = [0x6d, 0x28, 0xd9]; // #6d28d9
const WHITE = [0xff, 0xff, 0xff];
const DARK_BG = [0x0f, 0x0a, 0x1a]; // #0f0a1a

/**
 * Create a minimal valid PNG from RGBA pixel data.
 */
function createPNG(width, height, pixels) {
	// PNG signature
	const signature = Buffer.from([
		137, 80, 78, 71, 13, 10, 26, 10,
	]);

	// IHDR chunk
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // color type: RGBA
	ihdr[10] = 0; // compression
	ihdr[11] = 0; // filter
	ihdr[12] = 0; // interlace

	// Raw image data with filter bytes
	const rawData = Buffer.alloc(height * (1 + width * 4));
	for (let y = 0; y < height; y++) {
		rawData[y * (1 + width * 4)] = 0; // filter: none
		for (let x = 0; x < width; x++) {
			const srcIdx = (y * width + x) * 4;
			const dstIdx = y * (1 + width * 4) + 1 + x * 4;
			rawData[dstIdx] = pixels[srcIdx];
			rawData[dstIdx + 1] = pixels[srcIdx + 1];
			rawData[dstIdx + 2] = pixels[srcIdx + 2];
			rawData[dstIdx + 3] = pixels[srcIdx + 3];
		}
	}

	const compressed = deflateSync(rawData);

	function makeChunk(type, data) {
		const typeBuffer = Buffer.from(type, "ascii");
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length, 0);
		const crcInput = Buffer.concat([typeBuffer, data]);

		// CRC32
		let crc = 0xffffffff;
		for (let i = 0; i < crcInput.length; i++) {
			crc ^= crcInput[i];
			for (let j = 0; j < 8; j++) {
				crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
			}
		}
		crc ^= 0xffffffff;
		const crcBuf = Buffer.alloc(4);
		crcBuf.writeUInt32BE(crc >>> 0, 0);

		return Buffer.concat([len, typeBuffer, data, crcBuf]);
	}

	return Buffer.concat([
		signature,
		makeChunk("IHDR", ihdr),
		makeChunk("IDAT", compressed),
		makeChunk("IEND", Buffer.alloc(0)),
	]);
}

/**
 * Draw a filled circle (anti-aliased approximation).
 */
function fillCircle(pixels, w, h, cx, cy, r, color) {
	for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(h - 1, Math.ceil(cy + r)); y++) {
		for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(w - 1, Math.ceil(cx + r)); x++) {
			const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
			if (dist <= r + 0.5) {
				const alpha = dist > r - 0.5 ? Math.max(0, 1 - (dist - r + 0.5)) : 1;
				const idx = (y * w + x) * 4;
				const existingAlpha = pixels[idx + 3] / 255;
				const newAlpha = alpha;
				const outAlpha = newAlpha + existingAlpha * (1 - newAlpha);
				if (outAlpha > 0) {
					pixels[idx] = Math.round((color[0] * newAlpha + pixels[idx] * existingAlpha * (1 - newAlpha)) / outAlpha);
					pixels[idx + 1] = Math.round((color[1] * newAlpha + pixels[idx + 1] * existingAlpha * (1 - newAlpha)) / outAlpha);
					pixels[idx + 2] = Math.round((color[2] * newAlpha + pixels[idx + 2] * existingAlpha * (1 - newAlpha)) / outAlpha);
					pixels[idx + 3] = Math.round(outAlpha * 255);
				}
			}
		}
	}
}

/**
 * Draw a filled rounded rectangle.
 */
function fillRoundedRect(pixels, w, h, rx, ry, rw, rh, radius, color) {
	for (let y = ry; y < ry + rh && y < h; y++) {
		for (let x = rx; x < rx + rw && x < w; x++) {
			let inside = true;
			// Check corners
			if (x < rx + radius && y < ry + radius) {
				inside = Math.sqrt((x - (rx + radius)) ** 2 + (y - (ry + radius)) ** 2) <= radius;
			} else if (x > rx + rw - radius && y < ry + radius) {
				inside = Math.sqrt((x - (rx + rw - radius)) ** 2 + (y - (ry + radius)) ** 2) <= radius;
			} else if (x < rx + radius && y > ry + rh - radius) {
				inside = Math.sqrt((x - (rx + radius)) ** 2 + (y - (ry + rh - radius)) ** 2) <= radius;
			} else if (x > rx + rw - radius && y > ry + rh - radius) {
				inside = Math.sqrt((x - (rx + rw - radius)) ** 2 + (y - (ry + rh - radius)) ** 2) <= radius;
			}
			if (inside && x >= 0 && y >= 0) {
				const idx = (y * w + x) * 4;
				pixels[idx] = color[0];
				pixels[idx + 1] = color[1];
				pixels[idx + 2] = color[2];
				pixels[idx + 3] = 255;
			}
		}
	}
}

/**
 * Draw a thick line between two points.
 */
function drawThickLine(pixels, w, h, x1, y1, x2, y2, thickness, color) {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.sqrt(dx * dx + dy * dy);
	const steps = Math.ceil(len * 2);
	const r = thickness / 2;

	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const cx = x1 + dx * t;
		const cy = y1 + dy * t;
		fillCircle(pixels, w, h, cx, cy, r, color);
	}
}

/**
 * Draw the Whistle "W" logo.
 * A bold stylized W that looks like a whistle/sports emblem.
 */
function drawWhistleLogo(pixels, w, h, centerX, centerY, size, color) {
	const s = size;
	// W shape: 5 points forming a W
	const halfW = s * 0.42;
	const topY = centerY - s * 0.32;
	const bottomY = centerY + s * 0.32;
	const midY = centerY + s * 0.05;
	const thickness = s * 0.09;

	// Left stroke down
	drawThickLine(pixels, w, h,
		centerX - halfW, topY,
		centerX - halfW * 0.55, bottomY,
		thickness, color);

	// Left-center stroke up
	drawThickLine(pixels, w, h,
		centerX - halfW * 0.55, bottomY,
		centerX, midY,
		thickness, color);

	// Right-center stroke down
	drawThickLine(pixels, w, h,
		centerX, midY,
		centerX + halfW * 0.55, bottomY,
		thickness, color);

	// Right stroke up
	drawThickLine(pixels, w, h,
		centerX + halfW * 0.55, bottomY,
		centerX + halfW, topY,
		thickness, color);

	// Small whistle circle at top-right
	const whistleR = s * 0.07;
	fillCircle(pixels, w, h,
		centerX + halfW + whistleR * 1.5, topY - whistleR * 0.3,
		whistleR, color);
}

/**
 * Generate the standard icon (any purpose).
 */
function generateIcon(size) {
	const pixels = new Uint8Array(size * size * 4);

	// Fill with violet background (rounded rect fills full canvas)
	const radius = Math.round(size * 0.15);
	fillRoundedRect(pixels, size, size, 0, 0, size, size, radius, VIOLET);

	// Draw W logo
	drawWhistleLogo(pixels, size, size, size / 2, size / 2, size * 0.7, WHITE);

	return createPNG(size, size, pixels);
}

/**
 * Generate the maskable icon (with 20% safe zone padding).
 */
function generateMaskableIcon(size) {
	const pixels = new Uint8Array(size * size * 4);

	// Fill entire canvas with violet (maskable icons must fill the full canvas)
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const idx = (y * size + x) * 4;
			pixels[idx] = VIOLET[0];
			pixels[idx + 1] = VIOLET[1];
			pixels[idx + 2] = VIOLET[2];
			pixels[idx + 3] = 255;
		}
	}

	// Draw W logo smaller (within 80% safe zone)
	drawWhistleLogo(pixels, size, size, size / 2, size / 2, size * 0.5, WHITE);

	return createPNG(size, size, pixels);
}

// Generate all icons
writeFileSync(resolve(PUBLIC, "pwa-192x192.png"), generateIcon(192));
console.log("Created pwa-192x192.png");

writeFileSync(resolve(PUBLIC, "pwa-512x512.png"), generateIcon(512));
console.log("Created pwa-512x512.png");

writeFileSync(resolve(PUBLIC, "pwa-512x512-maskable.png"), generateMaskableIcon(512));
console.log("Created pwa-512x512-maskable.png");

console.log("All PWA icons generated successfully.");
