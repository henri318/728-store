import type { CategoryEntity } from '../domain/entities/category';
import type { CategoryRepository } from '../domain/category-repository';
import { resolveCategoryDisplay } from '../domain/entities/category-translation';

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
}
