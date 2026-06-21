import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { container } from '@/composition-root/container';
import { GetProductByIdUseCase } from '@/modules/products/application/get-product-by-id-use-case';
import { redirect } from 'next/navigation';

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: { productId: string };
}) {
  const { locale } = await params;
  const { productId } = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(
      `/${locale}/auth/signin?callbackUrl=/${locale}/checkout?productId=${productId}`,
    );
  }

  const repository = container.getProductRepository();
  const useCase = new GetProductByIdUseCase(repository);

  let product;
  try {
    product = await useCase.execute(productId, locale);
  } catch {
    return <div>Invalid product for checkout</div>;
  }

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '2rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
      }}
    >
      <h2>Checkout Summary</h2>
      <div
        style={{
          margin: '2rem 0',
          padding: '1rem',
          background: '#f9f9f9',
          borderRadius: '4px',
        }}
      >
        <p>
          <strong>Item:</strong> {product.displayName}
        </p>
        <p>
          <strong>Seller:</strong> {product.sellerName}
        </p>
        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          <strong>Total:</strong> {'$'}
          {product.basePrice}
        </p>
      </div>

      <form action={`/api/orders`} method="POST">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="locale" value={locale} />
        <button
          style={{
            width: '100%',
            padding: '1rem',
            background: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1.2rem',
          }}
        >
          Confirm and Pay with PayPal
        </button>
      </form>
    </div>
  );
}
