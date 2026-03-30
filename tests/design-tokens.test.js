import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STYLES_DIR = resolve(import.meta.dirname, '..', 'src', 'styles');
const tokensCSS = readFileSync(resolve(STYLES_DIR, 'tokens.css'), 'utf-8');
const baseCSS = readFileSync(resolve(STYLES_DIR, 'base.css'), 'utf-8');
const indexHTML = readFileSync(resolve(import.meta.dirname, '..', 'index.html'), 'utf-8');

describe('Design Tokens (tokens.css)', () => {
  describe('Zone colors', () => {
    it('defines --w-color-europe (violet)', () => {
      expect(tokensCSS).toContain('--w-color-europe:');
    });
    it('defines --w-color-top6 (green)', () => {
      expect(tokensCSS).toContain('--w-color-top6:');
    });
    it('defines --w-color-mid (grey)', () => {
      expect(tokensCSS).toContain('--w-color-mid:');
    });
    it('defines --w-color-relegation (red)', () => {
      expect(tokensCSS).toContain('--w-color-relegation:');
    });
  });

  describe('Zone background colors', () => {
    it('defines pale variants for zone backgrounds', () => {
      expect(tokensCSS).toContain('--w-color-europe-bg:');
      expect(tokensCSS).toContain('--w-color-top6-bg:');
      expect(tokensCSS).toContain('--w-color-mid-bg:');
      expect(tokensCSS).toContain('--w-color-relegation-bg:');
    });
  });

  describe('Functional palette', () => {
    it('defines primary color (violet)', () => {
      expect(tokensCSS).toContain('--w-color-primary:');
    });
    it('defines surface colors', () => {
      expect(tokensCSS).toContain('--w-color-surface:');
      expect(tokensCSS).toContain('--w-color-surface-elevated:');
    });
    it('defines text colors', () => {
      expect(tokensCSS).toContain('--w-color-text-primary:');
      expect(tokensCSS).toContain('--w-color-text-secondary:');
    });
    it('defines success and danger', () => {
      expect(tokensCSS).toContain('--w-color-success:');
      expect(tokensCSS).toContain('--w-color-danger:');
    });
  });

  describe('Confidence colors', () => {
    it('defines confidence level tokens', () => {
      expect(tokensCSS).toContain('--w-color-confidence-high:');
      expect(tokensCSS).toContain('--w-color-confidence-mid:');
      expect(tokensCSS).toContain('--w-color-confidence-low:');
    });
  });

  describe('Spacing scale (8px grid)', () => {
    it('defines all spacing tokens', () => {
      expect(tokensCSS).toContain('--w-space-xs:');
      expect(tokensCSS).toContain('--w-space-sm:');
      expect(tokensCSS).toContain('--w-space-md:');
      expect(tokensCSS).toContain('--w-space-lg:');
      expect(tokensCSS).toContain('--w-space-xl:');
      expect(tokensCSS).toContain('--w-space-2xl:');
    });
  });

  describe('Typography scale (6 levels)', () => {
    it('defines all typography size tokens', () => {
      expect(tokensCSS).toContain('--w-text-hero:');
      expect(tokensCSS).toContain('--w-text-h1:');
      expect(tokensCSS).toContain('--w-text-h2:');
      expect(tokensCSS).toContain('--w-text-body:');
      expect(tokensCSS).toContain('--w-text-label:');
      expect(tokensCSS).toContain('--w-text-caption:');
    });
  });

  describe('Shadow and radius tokens', () => {
    it('defines card radius and shadow', () => {
      expect(tokensCSS).toContain('--w-radius-card:');
      expect(tokensCSS).toContain('--w-radius-button:');
      expect(tokensCSS).toContain('--w-shadow-card:');
    });
  });

  describe('WCAG AA compliance', () => {
    it('uses violet #6d28d9 or darker for primary', () => {
      expect(tokensCSS).toMatch(/--w-color-primary:\s*#6d28d9/);
    });
    it('uses cream/beige for surface (not pure white)', () => {
      expect(tokensCSS).not.toMatch(/--w-color-surface:\s*#fff(fff)?\s*;/);
    });
    it('uses dark grey for text (not pure black)', () => {
      expect(tokensCSS).not.toMatch(/--w-color-text-primary:\s*#000(000)?\s*;/);
    });
  });

  describe('Open Props integration', () => {
    it('imports open-props easings', () => {
      expect(tokensCSS).toMatch(/open-props.*easing/i);
    });
  });
});

describe('Base styles (base.css)', () => {
  it('imports tokens.css', () => {
    expect(baseCSS).toContain('tokens.css');
  });

  it('includes box-sizing reset', () => {
    expect(baseCSS).toContain('box-sizing');
  });

  it('applies surface color to body background', () => {
    expect(baseCSS).toContain('--w-bg-page');
  });

  it('applies text-primary to body color', () => {
    expect(baseCSS).toContain('--w-text-primary');
  });

  it('sets Nunito as font-family', () => {
    expect(baseCSS).toMatch(/font-family:.*Nunito/i);
  });

  it('applies font-feature-settings tnum for tabular numbers', () => {
    expect(baseCSS).toContain('font-feature-settings');
    expect(baseCSS).toContain('"tnum"');
  });

  it('constrains app width to 430px', () => {
    expect(baseCSS).toContain('430px');
  });

  it('applies touch-action manipulation on interactive elements', () => {
    expect(baseCSS).toContain('touch-action: manipulation');
  });

  it('defines .w-card utility class', () => {
    expect(baseCSS).toContain('.w-card');
    expect(baseCSS).toContain('--w-color-surface-elevated');
    expect(baseCSS).toContain('--w-shadow-card');
    expect(baseCSS).toContain('--w-radius-card');
  });
});

describe('index.html', () => {
  it('has lang="fr"', () => {
    expect(indexHTML).toMatch(/<html\s[^>]*lang="fr"/);
  });

  it('loads Nunito from Google Fonts', () => {
    expect(indexHTML).toContain('fonts.googleapis.com');
    expect(indexHTML).toContain('Nunito');
  });

  it('has theme-color meta', () => {
    expect(indexHTML).toMatch(/meta\s[^>]*name="theme-color"/);
  });
});
