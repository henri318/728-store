import { container } from '@/composition-root/container';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { HeroSection } from '@/shared/ui/hero-section';
import { MiddleSection } from '@/shared/ui/middle-section';
import { WaveTransition } from '@/shared/ui/wave-transition';
import { BottomSection } from '@/shared/ui/bottom-section';
import { InfiniteProductList } from '@/components/products/infinite-product-list';
import {
  SearchInputWithSuggestions,
  type RecentSearchSuggestion,
} from '@/components/products/search-input-with-suggestions';
import { GetRecentSearchesUseCase } from '@/modules/search-history/application/get-recent-searches-use-case';
import { ProductListQueryUseCase } from '@/modules/products/application/product-list-query-use-case';

const PUBLIC_PAGE_SIZE = 10;

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q: qParam } = await searchParams;
  const q = (qParam ?? '').trim();
  const dict = await getDictionary(locale as 'es' | 'cat');

  // SSR first page — the storefront never renders a blank shell.
  // The outbox is required so that PUBLIC searches with a non-empty q
  // emit PRODUCT_SEARCH_EXECUTED and the search-history module records
  // the term for authenticated users.
  const session = await container.getSession().getSession();
  const useCase = new ProductListQueryUseCase(
    container.getProductRepository(),
    container.getOutboxRepository(), // needed for the event emission
  );
  const initial = await useCase.execute({
    audience: 'public',
    pageSize: PUBLIC_PAGE_SIZE,
    page: 1,
    q: q || undefined,
    lang: locale as 'es' | 'cat',
    userId: session?.id ?? null,
  });

  // Server-backed recent suggestions for authenticated users only.
  // v1 spec: guests receive null; no localStorage / sessionStorage / cookies
  // are ever written by the search feature.
  const recent: RecentSearchSuggestion[] | null = session
    ? await new GetRecentSearchesUseCase(container.getSearchHistoryRepository())
        .execute({ userId: session.id, locale })
        .then((entries) =>
          entries.map((e) => ({
            term: e.term,
            searchedAt: e.searchedAt.toISOString(),
          })),
        )
    : null;

  // Client island receives a stable JSON shape. We pre-format
  // the price string on the server so the client never receives
  // a function reference (React cannot serialize functions).
  const initialItems = initial.items.map((product) => ({
    id: product.id,
    basePrice: {
      amount: product.basePrice.amount,
      currency: product.basePrice.currency,
      formattedPrice: product.basePrice.format(),
    },
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    translations: product.translations,
    images: product.images,
    tags: product.tags,
  }));

  return (
    <div>
      <HeroSection
        imageSrc="/img/hero/Elementos-14.svg"
        imageAlt={dict.common.heroImageAlt}
      />

      <MiddleSection ariaLabel={dict.common.products}>
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
          key={q || 'all-products'}
          initialItems={initialItems}
          pageSize={PUBLIC_PAGE_SIZE}
          q={q}
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
            itemsLoadedOne: dict.common.itemsLoadedOne,
            itemsLoadedMany: dict.common.itemsLoadedMany,
          }}
        />
      </MiddleSection>

      <WaveTransition animatedText={dict.common.slogan} />

      <BottomSection />
    </div>
  );
}
