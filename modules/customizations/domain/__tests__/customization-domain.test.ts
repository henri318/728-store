import { describe, it, expect } from 'vitest';
import type { CustomizationEntity } from '../entities/customization';
import { CustomizationOptions } from '../value-objects/customization-options';

/**
 * T04 RED — Domain layer tests for CustomizationEntity + CustomizationOptions VO.
 *
 * Covers:
 *  - Entity shape (all fields — sellerId derived from Product, not stored)
 *  - VO validation: text ≤ 500, color ≤ 50 + non-empty, size ≤ 50 + non-empty,
 *    imageUrl must match ^https?://.+
 *  - VO equals()
 */
describe('CustomizationEntity', () => {
  it('should have the correct shape without sellerId', () => {
    const entity: CustomizationEntity = {
      id: 'cust-1',
      productId: 'prod-1',
      text: 'Hello',
      color: 'red',
      size: 'M',
      imageUrl: 'https://x.com/y.png',
      createdAt: new Date(),
    };

    expect(entity.id).toBe('cust-1');
    expect(entity.productId).toBe('prod-1');
    expect(entity.text).toBe('Hello');
    expect(entity.color).toBe('red');
    expect(entity.size).toBe('M');
    expect(entity.imageUrl).toBe('https://x.com/y.png');
    expect(entity.createdAt).toBeInstanceOf(Date);
  });

  it('should allow null optional fields', () => {
    const entity: CustomizationEntity = {
      id: 'cust-2',
      productId: 'prod-1',
      text: null,
      color: null,
      size: null,
      imageUrl: null,
      createdAt: new Date(),
    };

    expect(entity.text).toBeNull();
    expect(entity.color).toBeNull();
    expect(entity.size).toBeNull();
    expect(entity.imageUrl).toBeNull();
  });
});

describe('CustomizationOptions', () => {
  describe('create — valid inputs', () => {
    it('should create with all four fields', () => {
      const vo = CustomizationOptions.create({
        text: 'Hello',
        color: 'red',
        size: 'M',
        imageUrl: 'https://x.com/y.png',
      });

      expect(vo.text).toBe('Hello');
      expect(vo.color).toBe('red');
      expect(vo.size).toBe('M');
      expect(vo.imageUrl).toBe('https://x.com/y.png');
    });

    it('should create with no optional fields', () => {
      const vo = CustomizationOptions.create({});
      expect(vo.text).toBeUndefined();
      expect(vo.color).toBeUndefined();
      expect(vo.size).toBeUndefined();
      expect(vo.imageUrl).toBeUndefined();
    });

    it('should create with only text', () => {
      const vo = CustomizationOptions.create({ text: 'Hello' });
      expect(vo.text).toBe('Hello');
      expect(vo.color).toBeUndefined();
    });

    it('should accept http URLs', () => {
      const vo = CustomizationOptions.create({
        imageUrl: 'http://x.com/y.png',
      });
      expect(vo.imageUrl).toBe('http://x.com/y.png');
    });

    it('should accept https URLs', () => {
      const vo = CustomizationOptions.create({
        imageUrl: 'https://x.com/y.png',
      });
      expect(vo.imageUrl).toBe('https://x.com/y.png');
    });

    it('should normalize null to undefined', () => {
      const vo = CustomizationOptions.create({
        text: null,
        color: null,
        size: null,
        imageUrl: null,
      });
      expect(vo.text).toBeUndefined();
      expect(vo.color).toBeUndefined();
      expect(vo.size).toBeUndefined();
      expect(vo.imageUrl).toBeUndefined();
    });

    it('should accept text at exactly 500 chars', () => {
      const text = 'a'.repeat(500);
      const vo = CustomizationOptions.create({ text });
      expect(vo.text).toBe(text);
    });

    it('should accept color at exactly 50 chars', () => {
      const color = 'a'.repeat(50);
      const vo = CustomizationOptions.create({ color });
      expect(vo.color).toBe(color);
    });

    it('should accept size at exactly 50 chars', () => {
      const size = 'a'.repeat(50);
      const vo = CustomizationOptions.create({ size });
      expect(vo.size).toBe(size);
    });
  });

  describe('create — validation errors', () => {
    it('should reject text > 500 chars', () => {
      expect(() =>
        CustomizationOptions.create({ text: 'a'.repeat(501) }),
      ).toThrow();
    });

    it('should reject color > 50 chars', () => {
      expect(() =>
        CustomizationOptions.create({ color: 'a'.repeat(51) }),
      ).toThrow();
    });

    it('should reject size > 50 chars', () => {
      expect(() =>
        CustomizationOptions.create({ size: 'a'.repeat(51) }),
      ).toThrow();
    });

    it('should reject blank color (whitespace only)', () => {
      expect(() => CustomizationOptions.create({ color: '  ' })).toThrow();
    });

    it('should reject blank size (whitespace only)', () => {
      expect(() => CustomizationOptions.create({ size: '  ' })).toThrow();
    });

    it('should reject empty color string', () => {
      expect(() => CustomizationOptions.create({ color: '' })).toThrow();
    });

    it('should reject empty size string', () => {
      expect(() => CustomizationOptions.create({ size: '' })).toThrow();
    });

    it('should reject ftp URL', () => {
      expect(() =>
        CustomizationOptions.create({ imageUrl: 'ftp://x.com/y.png' }),
      ).toThrow();
    });

    it('should reject URL without protocol', () => {
      expect(() =>
        CustomizationOptions.create({ imageUrl: 'x.com/y.png' }),
      ).toThrow();
    });

    it('should reject URL with just http://', () => {
      expect(() =>
        CustomizationOptions.create({ imageUrl: 'http://' }),
      ).toThrow();
    });
  });

  describe('equals', () => {
    it('should return true for identical options', () => {
      const a = CustomizationOptions.create({
        text: 'Hi',
        color: 'red',
        size: 'M',
        imageUrl: 'https://x.com/y.png',
      });
      const b = CustomizationOptions.create({
        text: 'Hi',
        color: 'red',
        size: 'M',
        imageUrl: 'https://x.com/y.png',
      });
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different text', () => {
      const a = CustomizationOptions.create({ text: 'Hi' });
      const b = CustomizationOptions.create({ text: 'Bye' });
      expect(a.equals(b)).toBe(false);
    });

    it('should return false when compared to non-CustomizationOptions', () => {
      const a = CustomizationOptions.create({ text: 'Hi' });
      expect(a.equals({} as CustomizationOptions)).toBe(false);
    });

    it('should return true for two empty options', () => {
      const a = CustomizationOptions.create({});
      const b = CustomizationOptions.create({});
      expect(a.equals(b)).toBe(true);
    });
  });
});
