import { ConflictError, NotFoundError } from '@/shared/kernel/app-error';
import type { CategoryRepository } from '../domain/category-repository';

export interface DeleteCategoryDTO {
  id: string;
}

export class DeleteCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(dto: DeleteCategoryDTO): Promise<void> {
    const category = await this.categoryRepository.findById(dto.id);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const productCount = await this.categoryRepository.countProducts(dto.id);
    if (productCount > 0) {
      throw new ConflictError('Category is in use', 'Category is in use');
    }

    await this.categoryRepository.delete(dto.id);
  }
}
