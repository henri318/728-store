import { container } from '@/composition-root/container';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { HeroSection } from '@/shared/ui/hero-section';
import { WaveTransition } from '@/shared/ui/wave-transition';
import { InfiniteProductList } from '@/components/products/infinite-product-list';
import {
  SearchInputWithSuggestions,
  type RecentSearchSuggestion,
} from '@/components/products/search-input-with-suggestions';
import { serializeProduct } from '@/modules/products/presentation/product-response';

const PUBLIC_PAGE_SIZE = 12;

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { locale } = await params;
  const { q: qParam, category: categoryParam } = await searchParams;
  const q = (qParam ?? '').trim();
  const category = (categoryParam ?? '').trim() || undefined;
  const dict = await getDictionary(locale as 'es' | 'cat');

  // SSR first page — the storefront never renders a blank shell.
  // The outbox is required so that PUBLIC searches with a non-empty q
  // emit PRODUCT_SEARCH_EXECUTED and the search-history module records
  // the term for authenticated users.
  const session = await container.getSession().getSession();
  const useCase = container.getProductListQueryUseCase();
  const initial = await useCase.execute({
    audience: 'public',
    pageSize: PUBLIC_PAGE_SIZE,
    page: 1,
    q: q || undefined,
    category,
    lang: locale as 'es' | 'cat',
    userId: session?.id ?? null,
  });

  // Server-backed recent suggestions for authenticated users only.
  // v1 spec: guests receive null; no localStorage / sessionStorage / cookies
  // are ever written by the search feature.
  let recent: RecentSearchSuggestion[] | null = null;
  if (session) {
    const entries = await container
      .getRecentSearchesUseCase()
      .execute({ userId: session.id, locale });
    recent = entries.map((e) => ({
      term: e.term,
      searchedAt: e.searchedAt.toISOString(),
    }));
  }

  // Client island receives a stable JSON shape. We pre-format
  // the price string on the server so the client never receives
  // a function reference (React cannot serialize functions).
  const initialItems = initial.items.map((product) => ({
    ...serializeProduct(product, {
      publicView: true,
      listingView: true,
    }),
    basePrice: {
      amount: product.basePrice.amount,
      currency: product.basePrice.currency,
      formattedPrice: product.basePrice.format(),
    },
  }));

  return (
    <div>
      <HeroSection
        imageSrc="/img/decorations/Portada.webp"
        imageAlt={dict.common.heroImageAlt}
      />

      <WaveTransition animatedText={dict.common.slogan} />

      <section aria-label={dict.common.products}>
        <SearchInputWithSuggestions
          initialValue={q}
          recent={recent}
          locale={locale}
          labels={{
            placeholder: dict.common.searchPlaceholder,
            ariaLabel: dict.common.searchAriaLabel,
            submitLabel: dict.common.searchSubmitLabel,
            recentSearchesLabel: dict.common.recentSearchesLabel,
            noRecentSearches: dict.common.noRecentSearches,
          }}
        />
        <InfiniteProductList
          key={JSON.stringify([q, category])}
          initialItems={initialItems}
          pageSize={PUBLIC_PAGE_SIZE}
          q={q}
          category={category}
          locale={locale}
          labels={{
            viewDetails: dict.common.viewDetails,
            addToCart: dict.common.addToCart,
            removeFromCart: dict.common.removeFromCart,
            increaseQuantity: dict.common.increaseQuantity,
            decreaseQuantity: dict.common.decreaseQuantity,
            loadingMore: dict.common.loadingMore,
            noSearchResults: dict.common.noSearchResults,
            noProducts: dict.common.noProducts,
            noImageAvailable: dict.common.noImageAvailable,
            itemsLoadedOne: dict.common.itemsLoadedOne,
            itemsLoadedMany: dict.common.itemsLoadedMany,
            showMore: dict.common.showMore,
            showLess: dict.common.showLess,
          }}
        />
      </section>
    </div>
  );
}
