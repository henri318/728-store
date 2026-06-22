import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { container } from '@/composition-root/container';
import { GetProductByIdUseCase } from '@/modules/products/application/get-product-by-id-use-case';
import { redirect } from 'next/navigation';
import styles from './page.module.css';

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
    <div className={styles.container}>
      <h2>Checkout Summary</h2>
      <div className={styles.summaryBox}>
        <p>
          <strong>Item:</strong> {product.displayName}
        </p>
        <p>
          <strong>Seller:</strong> {product.sellerName}
        </p>
        <p className={styles.totalPrice}>
          <strong>Total:</strong> {'$'}
          {product.basePrice}
        </p>
      </div>

      <form action={`/api/orders`} method="POST">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="locale" value={locale} />
        <button className={styles.submitButton}>
          Confirm and Pay with PayPal
        </button>
      </form>
    </div>
  );
}
