import type { CategoryEntity } from '../domain/entities/category';
import type { CategoryRepository } from '../domain/category-repository';
import { resolveCategoryDisplay } from '../domain/entities/category-translation';

export interface CategoryOption {
  id: string;
  name: string;
}

export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(locale: 'es' | 'cat'): Promise<CategoryEntity[]> {
    const categories = await this.categoryRepository.findAll();
    const collator = new Intl.Collator(locale);
    return categories.toSorted((a, b) =>
      collator.compare(
        resolveCategoryDisplay(a.translations, locale)?.name ?? '',
        resolveCategoryDisplay(b.translations, locale)?.name ?? '',
      ),
    );
  }

  async executeOptions(locale: 'es' | 'cat'): Promise<CategoryOption[]> {
    const categories = await this.execute(locale);
    return categories.map((category) => ({
      id: category.id,
      name: resolveCategoryDisplay(category.translations, locale)?.name ?? '',
    }));
  }
}
