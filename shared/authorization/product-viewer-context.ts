import { container } from '@/composition-root/container';
import type { Role } from '@/modules/roles/domain/roles';

export interface ProductViewerContext {
  viewerUserId: string | null;
  viewerRole: Role | null;
  isOwner: boolean;
  canEdit: boolean;
  editHref: string | null;
}

interface ProductViewerTarget {
  id: string;
  sellerId: string;
}

export async function resolveProductViewerContext(
  product: ProductViewerTarget,
  locale: 'es' | 'cat',
): Promise<ProductViewerContext> {
  const anonymousContext: ProductViewerContext = {
    viewerUserId: null,
    viewerRole: null,
    isOwner: false,
    canEdit: false,
    editHref: null,
  };

  try {
    const session = await container.getSession().getSession();
    if (!session?.id) return anonymousContext;

    const user = await container.getUserLookup().findById(session.id);
    const viewerRole = user?.role ?? null;
    if (viewerRole !== 'DESIGNER') {
      return {
        ...anonymousContext,
        viewerUserId: session.id,
        viewerRole,
      };
    }

    const seller = await container
      .getSellerRepository()
      .findByUserId(session.id);
    const isOwner = seller?.sellerId.value === product.sellerId;

    return {
      viewerUserId: session.id,
      viewerRole,
      isOwner,
      canEdit: isOwner,
      editHref: isOwner
        ? `/${locale}/seller/products/${product.id}/edit`
        : null,
    };
  } catch {
    return anonymousContext;
  }
}
