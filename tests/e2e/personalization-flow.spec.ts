import { expect } from '@playwright/test';
import { test } from './admin/fixtures';

test.describe('Personalization flow', () => {
  test('adds two different personalizations as separate cart lines', async ({
    customerPage,
  }) => {
    await customerPage.goto('/es');
    const detailsHref = await customerPage
      .getByRole('link', { name: 'Ver Detalles' })
      .first()
      .getAttribute('href');
    expect(detailsHref).toBeTruthy();

    await customerPage.goto(detailsHref!);
    await customerPage.waitForLoadState('networkidle');
    const designField = customerPage.getByLabel(
      'Cuéntanos cómo quieres personalizarlo',
    );
    await designField.fill('First design');
    await customerPage
      .getByRole('button', { name: 'Añadir al carrito' })
      .waitFor({ state: 'visible' });
    await customerPage
      .getByRole('button', { name: 'Añadir al carrito' })
      .click();

    await expect(
      customerPage.getByRole('button', { name: 'Añadido' }),
    ).toBeVisible();

    await designField.fill('Second design');
    await customerPage
      .getByRole('button', { name: 'Añadir otra personalización' })
      .click();
    await expect(
      customerPage.getByRole('button', { name: 'Añadido' }),
    ).toBeVisible();

    await customerPage.goto('/es/cart');
    await expect(customerPage.getByText('First design')).toBeVisible();
    await expect(customerPage.getByText('Second design')).toBeVisible();
    await expect(customerPage.getByText('Error en el carrito')).toHaveCount(0);
  });
});
