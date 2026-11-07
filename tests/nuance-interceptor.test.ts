import { describe, it, expect } from 'vitest';
import { NuanceInterceptor, CURATED_NUANCE_RULES } from '../src/domain/srs/nuance-interceptor';

describe('NuanceInterceptor Engine', () => {
  describe('String Normalization', () => {
    it('strips leading and trailing wave dashes and whitespace', () => {
      expect(NuanceInterceptor.normalize('〜ものなら')).toBe('ものなら');
      expect(NuanceInterceptor.normalize('～としたら～')).toBe('としたら');
      expect(NuanceInterceptor.normalize('  ~ないことには  ')).toBe('ないことには');
      expect(NuanceInterceptor.normalize('に 決まって いる')).toBe('に決まっている');
    });
  });

  describe('Exact Match Detection', () => {
    it('recognizes exact matches with and without tildes', () => {
      const res1 = NuanceInterceptor.inspect('ものなら', 'ものなら');
      expect(res1.status).toBe('exact_match');

      const res2 = NuanceInterceptor.inspect('〜ものなら', 'ものなら');
      expect(res2.status).toBe('exact_match');

      const res3 = NuanceInterceptor.inspect('〜に決まっている〜', 'に決まっている');
      expect(res3.status).toBe('exact_match');
    });
  });

  describe('Curated Synonym Warnings (No Interval Deduction)', () => {
    it('intercepts "としたら" when "ものなら" is expected', () => {
      const res = NuanceInterceptor.inspect('としたら', 'ものなら');
      expect(res.status).toBe('synonym_warning');
      expect(res.warningMessageEn).toContain('unlikely or impossible wish/desire');
      expect(res.warningMessageMy).toBeDefined();
      expect(res.conjugationNote).toContain('ものなら');
    });

    it('intercepts "ものなら" when "としたら" is expected', () => {
      const res = NuanceInterceptor.inspect('ものなら', 'としたら');
      expect(res.status).toBe('synonym_warning');
      expect(res.warningMessageEn).toContain('neutral hypothetical assumption');
    });

    it('intercepts "てならない" when "てたまらない" is expected', () => {
      const res = NuanceInterceptor.inspect('てならない', 'てたまらない');
      expect(res.status).toBe('synonym_warning');
      expect(res.warningMessageEn).toContain('overwhelming physical sensation');
    });

    it('intercepts "に違いない" when "に決まっている" is expected', () => {
      const res = NuanceInterceptor.inspect('に違いない', 'に決まっている');
      expect(res.status).toBe('synonym_warning');
      expect(res.warningMessageEn).toContain('strong subjective conviction');
    });

    it('intercepts "気味" when "がち" is expected', () => {
      const res = NuanceInterceptor.inspect('気味', 'がち');
      expect(res.status).toBe('synonym_warning');
      expect(res.warningMessageEn).toContain('frequent negative habit');
    });

    it('supports custom acceptable synonyms passed via argument', () => {
      const res = NuanceInterceptor.inspect('おまけに', 'ついでに', ['おまけに']);
      expect(res.status).toBe('synonym_warning');
      expect(res.target).toBe('ついでに');
    });
  });

  describe('Incorrect Answers', () => {
    it('marks completely unrelated inputs as incorrect', () => {
      const res1 = NuanceInterceptor.inspect('たべる', 'ものなら');
      expect(res1.status).toBe('incorrect');

      const res2 = NuanceInterceptor.inspect('きれいだ', 'にほかならない');
      expect(res2.status).toBe('incorrect');
    });
  });
});
