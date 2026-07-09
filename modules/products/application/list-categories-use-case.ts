import type { CategoryEntity } from '../domain/entities/category';
import type { CategoryRepository } from '../domain/category-repository';

export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(): Promise<CategoryEntity[]> {
    return this.categoryRepository.findAllSorted();
  }
}
