import { container } from '@/composition-root/container';
import { GetProductByIdUseCase } from '@/modules/products/application/get-product-by-id-use-case';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import Link from 'next/link';
import styles from './page.module.css';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');

  const repository = container.getProductRepository();
  const useCase = new GetProductByIdUseCase(repository);

  let product = null;
  let error = false;

  try {
    product = await useCase.execute(id, locale);
  } catch {
    error = true;
  }

  if (error || !product) {
    return (
      <div>Error loading product details. Please check the server logs.</div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href={`/${locale}`} className={styles.backLink}>
        ← {dict.common.home}
      </Link>
      <div className={styles.grid}>
        <div className={styles.imagePlaceholder}>
          <span className={styles.imagePlaceholderText}>
            Product Image Placeholder
          </span>
        </div>
        <div>
          <h1>{product.displayName}</h1>
          <p className={styles.description}>{product.displayDescription}</p>
          <p className={styles.price}>
            {'$'}
            {product.basePrice}
          </p>
          <p className={styles.seller}>Seller: {product.sellerName}</p>

          <form action="/api/orders" method="POST" className={styles.form}>
            <input type="hidden" name="productId" value={product.id} />

            <div className={styles.formGroup}>
              <label htmlFor="customizationText" className={styles.label}>
                Custom Text:
              </label>
              <input
                type="text"
                id="customizationText"
                name="customizationText"
                className={styles.textInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="customizationColor" className={styles.label}>
                Color:
              </label>
              <input
                type="color"
                id="customizationColor"
                name="customizationColor"
                defaultValue="#ffffff"
                className={styles.colorInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="customizationSize" className={styles.label}>
                Size:
              </label>
              <select
                id="customizationSize"
                name="customizationSize"
                className={styles.selectInput}
              >
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="customizationImage" className={styles.label}>
                Image:
              </label>
              <input
                type="file"
                id="customizationImage"
                name="customizationImage"
                accept="image/*"
                className={styles.fileInput}
              />
              <small className={styles.fileHint}>
                Image upload functionality not fully implemented.
              </small>
            </div>

            <button type="submit" className={styles.submitButton}>
              Add to Cart / Buy Now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
