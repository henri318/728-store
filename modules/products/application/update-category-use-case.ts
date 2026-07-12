import { NotFoundError, ValidationError } from '@/shared/kernel/app-error';
import type { CategoryRepository } from '../domain/category-repository';
import type { CategoryEntity } from '../domain/entities/category';
import { CategorySlug } from '../domain/value-objects/category-slug';

export interface UpdateCategoryDTO {
  id: string;
  nameEs: string;
  nameCat: string;
}

export class UpdateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(dto: UpdateCategoryDTO): Promise<CategoryEntity> {
    const nameEs = dto.nameEs.trim();
    const nameCat = dto.nameCat.trim();
    if (!nameEs || !nameCat) {
      throw new ValidationError(
        'Both Spanish and Catalan category names are required',
      );
    }

    const existing = await this.categoryRepository.findById(dto.id);
    if (!existing) {
      throw new NotFoundError('Category not found');
    }

    let slug: string;
    try {
      slug = CategorySlug.create(nameEs).value;
    } catch {
      throw new ValidationError(
        'Category name must contain at least one alphanumeric character',
      );
    }

    return this.categoryRepository.update({
      ...existing,
      slug,
      translations: [
        { locale: 'es', name: nameEs },
        { locale: 'cat', name: nameCat },
      ],
    });
  }
}
