import { expect, type Page } from '@playwright/test';
import { test } from './admin/fixtures';

type CartItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  customizations: Array<{ text: string | null }>;
};

type CartResponse = { items: CartItem[] };

function productIdFromHref(href: string): string {
  return new URL(href, 'http://localhost:3000').pathname.split('/').pop()!;
}

async function getCart(page: Page): Promise<CartResponse> {
  const response = await page.request.get('/api/cart');
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CartResponse;
}

function waitForCartSync(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/cart') &&
      response.request().method() === 'GET',
  );
}

function waitForCustomizationCreation(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/customizations/customer') &&
      response.request().method() === 'POST',
  );
}

test.describe('Personalization flow', () => {
  test('adds two different personalizations as separate cart lines', async ({
    customerPage,
  }) => {
    await customerPage.goto('/es');
    const detailsLinks = customerPage.getByRole('link', {
      name: 'Ver Detalles',
    });
    const detailsHrefs = await detailsLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')).filter(Boolean),
    );
    expect(detailsHrefs.length).toBeGreaterThanOrEqual(2);
    const detailsHref = detailsHrefs[0];
    const unrelatedProductHref = detailsHrefs[1];
    expect(detailsHref).toBeTruthy();
    expect(unrelatedProductHref).toBeTruthy();

    const productId = productIdFromHref(detailsHref!);
    const unrelatedProductId = productIdFromHref(unrelatedProductHref!);
    let cart = await getCart(customerPage);

    // Isolate only the product under test. Existing unrelated lines are kept.
    for (const item of cart.items) {
      if (item.productId !== productId) continue;
      const response = await customerPage.request.delete(
        `/api/cart/items/${item.id}`,
      );
      expect(response.ok()).toBeTruthy();
    }

    cart = await getCart(customerPage);
    expect(cart.items.every((item) => item.productId !== productId)).toBe(true);

    // Guarantee a deterministic unrelated line when the seeded cart is empty,
    // while preserving every unrelated line that was already present.
    if (cart.items.every((item) => item.productId !== unrelatedProductId)) {
      const response = await customerPage.request.post('/api/cart/items', {
        data: { productId: unrelatedProductId, quantity: 1 },
      });
      expect(response.status()).toBe(201);
      cart = await getCart(customerPage);
    }
    const priorUnrelatedItems = cart.items.filter(
      (item) => item.productId !== productId,
    );
    expect(priorUnrelatedItems.length).toBeGreaterThan(0);

    await customerPage.goto(detailsHref!);
    const designField = customerPage.getByLabel(
      'Cuéntanos cómo quieres personalizarlo',
    );
    const firstCartSync = waitForCartSync(customerPage);
    await designField.fill('First design');
    await firstCartSync;
    const firstCustomizationCreation =
      waitForCustomizationCreation(customerPage);
    await customerPage
      .getByRole('button', { name: 'Añadir al carrito' })
      .click();
    const firstCustomizationResponse = await firstCustomizationCreation;
    expect(
      firstCustomizationResponse.status(),
      await firstCustomizationResponse.text(),
    ).toBe(201);

    await expect(
      customerPage.getByRole('button', { name: 'Añadido' }),
    ).toBeVisible();

    const secondCartSync = waitForCartSync(customerPage);
    await designField.fill('Second design');
    await secondCartSync;
    const secondCustomizationCreation =
      waitForCustomizationCreation(customerPage);
    await customerPage
      .getByRole('button', { name: 'Añadir al carrito' })
      .click();
    const secondCustomizationResponse = await secondCustomizationCreation;
    expect(
      secondCustomizationResponse.status(),
      await secondCustomizationResponse.text(),
    ).toBe(201);
    await expect(
      customerPage.getByRole('button', { name: 'Añadido' }),
    ).toBeVisible();

    cart = await getCart(customerPage);
    const finalTargetItems = cart.items.filter(
      (item) => item.productId === productId,
    );
    expect(finalTargetItems).toHaveLength(2);
    expect(
      finalTargetItems.flatMap((item) =>
        item.customizations.map((c) => c.text),
      ),
    ).toEqual(expect.arrayContaining(['First design', 'Second design']));
    for (const priorItem of priorUnrelatedItems) {
      expect(cart.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: priorItem.id,
            productId: priorItem.productId,
            quantity: priorItem.quantity,
          }),
        ]),
      );
    }

    await customerPage.goto('/es/cart');
    await expect(customerPage.getByText('First design')).toBeVisible();
    await expect(customerPage.getByText('Second design')).toBeVisible();
    for (const priorItem of priorUnrelatedItems) {
      await expect(customerPage.getByText(priorItem.productName)).toBeVisible();
    }
    await expect(customerPage.getByText('Error en el carrito')).toHaveCount(0);
  });
});
