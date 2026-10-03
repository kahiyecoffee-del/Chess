import { describe, expect, it } from 'vitest';
import { EN, LOCALES, matchLanguage, setLanguage, t } from '../src/game/i18n';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n', () => {
  it('ships 35 languages with unique codes', () => {
    expect(LOCALES).toHaveLength(35);
    expect(new Set(LOCALES.map((l) => l.code)).size).toBe(35);
  });

  for (const locale of LOCALES) {
    it(`${locale.code} has every key with the same placeholders`, () => {
      for (const key of Object.keys(EN) as (keyof typeof EN)[]) {
        const text = locale.t[key];
        expect(text, `${locale.code}.${key}`).toBeTruthy();
        expect(placeholders(text), `${locale.code}.${key}`).toEqual(placeholders(EN[key]));
      }
      expect(Object.keys(locale.t).length).toBe(Object.keys(EN).length);
    });
  }

  it('matches device languages', () => {
    expect(matchLanguage(['tr-TR'])).toBe('tr');
    expect(matchLanguage(['pt-PT'])).toBe('pt');
    expect(matchLanguage(['zh-HK'])).toBe('zh-TW');
    expect(matchLanguage(['zh'])).toBe('zh-CN');
    expect(matchLanguage(['tl-PH'])).toBe('fil');
    expect(matchLanguage(['xx', 'de-AT'])).toBe('de');
    expect(matchLanguage(['xx'])).toBe('en');
  });

  it('formats with variables and falls back to English', () => {
    setLanguage('tr');
    expect(t('level', { n: 5 })).toBe('Seviye 5');
    setLanguage('nope');
    expect(t('level', { n: 5 })).toBe('Level 5');
  });
});
