import { describe, expect, it } from 'vitest';
import {
  emailTemplateRegistry,
  renderEmailTemplate,
} from '@/modules/email/application/templates/template-registry';

describe('emailTemplateRegistry', () => {
  it('registers all v1 transactional templates', () => {
    expect(
      Object.keys(emailTemplateRegistry).toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(
      [
        'order-completed',
        'order-in-progress',
        'order-placed',
        'password-reset',
        'seller-created',
      ].toSorted((a, b) => a.localeCompare(b)),
    );
  });
});

describe('renderEmailTemplate', () => {
  it.each([
    [
      'password-reset',
      {
        name: 'Ana',
        resetLink: 'https://example.test/reset?token=abc',
        expiresAt: '2026-07-08 10:30',
      },
      'Restablecé tu contraseña',
      ['Hola Ana', 'https://example.test/reset?token=abc', '2026-07-08 10:30'],
    ],
    [
      'seller-created',
      {
        name: 'Ana',
        sellerName: 'Tienda Norte',
      },
      'Tu cuenta de vendedor fue creada',
      ['Hola Ana', 'Tienda Norte'],
    ],
    [
      'order-placed',
      {
        name: 'Ana',
        orderNumber: 'ORD-123',
        total: 125.5,
        currency: 'EUR',
        itemsCount: 3,
      },
      'Confirmamos tu pedido',
      ['Hola Ana', '#ORD-123', '3 artículos', 'EUR 125.50'],
    ],
    [
      'order-in-progress',
      {
        name: 'Ana',
        orderNumber: 'ORD-123',
        total: 125.5,
        currency: 'EUR',
        itemsCount: 3,
      },
      'Tu pedido está en preparación',
      ['Hola Ana', '#ORD-123', 'en preparación'],
    ],
    [
      'order-completed',
      {
        name: 'Ana',
        orderNumber: 'ORD-123',
        total: 125.5,
        currency: 'EUR',
        itemsCount: 3,
      },
      'Tu pedido está listo',
      ['Hola Ana', '#ORD-123', 'está listo'],
    ],
  ] as const)(
    'renders %s in es with the expected subject and body fragments',
    (key, data, subject, fragments) => {
      const result = renderEmailTemplate(key, 'es', data);

      expect(result.subject).toBe(subject);
      for (const fragment of fragments) {
        expect(result.htmlBody).toContain(fragment);
      }
    },
  );

  it.each(['order-placed', 'order-in-progress', 'order-completed'] as const)(
    'escapes itemsCount for %s',
    (key) => {
      const result = renderEmailTemplate(key, 'es', {
        name: 'Ana',
        orderNumber: 'ORD-123',
        total: 125.5,
        currency: 'EUR',
        itemsCount: '<img src=x onerror=alert(1)>' as unknown as number,
      });

      expect(result.htmlBody).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(result.htmlBody).not.toContain('<img src=x onerror=alert(1)>');
    },
  );

  it('falls back to a safe reset link for unsupported protocols', () => {
    const result = renderEmailTemplate('password-reset', 'es', {
      name: 'Ana',
      resetLink: 'javascript:alert(1)',
      expiresAt: '2026-07-08 10:30',
    });

    expect(result.htmlBody).toContain('href="#"');
    expect(result.htmlBody).not.toContain('javascript:alert(1)');
  });

  it.each([
    [
      'password-reset',
      {
        name: 'Ana',
        resetLink: 'https://example.test/reset?token=abc',
        expiresAt: '2026-07-08 10:30',
      },
    ],
    [
      'seller-created',
      {
        name: 'Ana',
        sellerName: 'Tienda Norte',
      },
    ],
    [
      'order-placed',
      {
        name: 'Ana',
        orderNumber: 'ORD-123',
        total: 125.5,
        currency: 'EUR',
        itemsCount: 3,
      },
    ],
    [
      'order-in-progress',
      {
        name: 'Ana',
        orderNumber: 'ORD-123',
        total: 125.5,
        currency: 'EUR',
        itemsCount: 3,
      },
    ],
    [
      'order-completed',
      {
        name: 'Ana',
        orderNumber: 'ORD-123',
        total: 125.5,
        currency: 'EUR',
        itemsCount: 3,
      },
    ],
  ] as const)('falls back to es for unsupported locale on %s', (key, data) => {
    const expected = renderEmailTemplate(key, 'es', data);
    const fallback = renderEmailTemplate(key, 'fr', data);

    expect(fallback).toEqual(expected);
  });
});
