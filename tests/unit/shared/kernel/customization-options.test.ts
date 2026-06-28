import { describe, it, expect } from 'vitest';
import { CustomizationOptions } from '@/modules/customizations/domain/value-objects/customization-options';

describe('CustomizationOptions', () => {
  describe('create()', () => {
    it('should create with all fields', () => {
      const opts = CustomizationOptions.create({
        text: 'Happy Birthday!',
        color: 'red',
        size: 'M',
        imageUrl: 'https://example.com/photo.png',
      });
      expect(opts).toBeInstanceOf(CustomizationOptions);
      expect(opts.text).toBe('Happy Birthday!');
      expect(opts.color).toBe('red');
      expect(opts.size).toBe('M');
      expect(opts.imageUrl).toBe('https://example.com/photo.png');
    });

    it('should create with partial fields', () => {
      const opts = CustomizationOptions.create({
        text: 'Hello',
        color: 'blue',
      });
      expect(opts.text).toBe('Hello');
      expect(opts.color).toBe('blue');
      expect(opts.size).toBeUndefined();
      expect(opts.imageUrl).toBeUndefined();
    });

    it('should create with empty object', () => {
      const opts = CustomizationOptions.create({});
      expect(opts.text).toBeUndefined();
      expect(opts.color).toBeUndefined();
      expect(opts.size).toBeUndefined();
      expect(opts.imageUrl).toBeUndefined();
    });

    it('should reject text longer than 500 chars', () => {
      const longText = 'a'.repeat(501);
      expect(() => CustomizationOptions.create({ text: longText })).toThrow(
        'Customization text must be at most 500 characters',
      );
    });

    it('should accept text with exactly 500 chars', () => {
      const text500 = 'a'.repeat(500);
      const opts = CustomizationOptions.create({ text: text500 });
      expect(opts.text).toBe(text500);
    });

    it('should reject invalid imageUrl format: missing protocol', () => {
      expect(() =>
        CustomizationOptions.create({ imageUrl: 'example.com/photo.png' }),
      ).toThrow('Customization image URL must be a valid URL');
    });

    it('should reject invalid imageUrl format: empty string', () => {
      expect(() => CustomizationOptions.create({ imageUrl: '' })).toThrow(
        'Customization image URL must be a valid URL',
      );
    });

    it('should accept valid http imageUrl', () => {
      const opts = CustomizationOptions.create({
        imageUrl: 'http://example.com/photo.png',
      });
      expect(opts.imageUrl).toBe('http://example.com/photo.png');
    });

    it('should accept valid https imageUrl', () => {
      const opts = CustomizationOptions.create({
        imageUrl: 'https://cdn.example.com/images/photo.jpg',
      });
      expect(opts.imageUrl).toBe('https://cdn.example.com/images/photo.jpg');
    });
  });

  describe('equals()', () => {
    it('should return true for identical options', () => {
      const a = CustomizationOptions.create({ text: 'Hi', color: 'red' });
      const b = CustomizationOptions.create({ text: 'Hi', color: 'red' });
      expect(a.equals(b)).toBe(true);
    });

    it('should return false if text differs', () => {
      const a = CustomizationOptions.create({ text: 'Hi', color: 'red' });
      const b = CustomizationOptions.create({ text: 'Hello', color: 'red' });
      expect(a.equals(b)).toBe(false);
    });

    it('should return false if color differs', () => {
      const a = CustomizationOptions.create({ text: 'Hi', color: 'red' });
      const b = CustomizationOptions.create({ text: 'Hi', color: 'blue' });
      expect(a.equals(b)).toBe(false);
    });

    it('should return false if size differs', () => {
      const a = CustomizationOptions.create({ size: 'M' });
      const b = CustomizationOptions.create({ size: 'L' });
      expect(a.equals(b)).toBe(false);
    });

    it('should return false if imageUrl differs', () => {
      const a = CustomizationOptions.create({
        imageUrl: 'https://example.com/a.png',
      });
      const b = CustomizationOptions.create({
        imageUrl: 'https://example.com/b.png',
      });
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for empty vs populated fields', () => {
      const a = CustomizationOptions.create({ text: 'Hi' });
      const b = CustomizationOptions.create({});
      expect(a.equals(b)).toBe(false);
    });
  });
});
