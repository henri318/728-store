import { randomUUID } from 'node:crypto';
import { ConflictError, ValidationError } from '@/shared/kernel/app-error';
import type { CategoryRepository } from '../domain/category-repository';
import type { CategoryEntity } from '../domain/entities/category';
import { CategorySlug } from '../domain/value-objects/category-slug';

export interface CreateCategoryDTO {
  name: string;
}

function normalizeCategoryName(name: string): string {
  return name.trim();
}

export class CreateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(dto: CreateCategoryDTO): Promise<CategoryEntity> {
    const name = normalizeCategoryName(dto.name);

    if (!name) {
      throw new ValidationError('Category name is required');
    }

    let slug: string;
    try {
      slug = CategorySlug.create(name).value;
    } catch {
      throw new ValidationError(
        'Category name must contain at least one alphanumeric character',
      );
    }

    const existing = await this.categoryRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictError(
        'Category already exists',
        'Category already exists',
      );
    }

    const category: CategoryEntity = {
      id: randomUUID(),
      name,
      slug,
      parentId: null,
      createdAt: new Date(),
    };

    return this.categoryRepository.save(category);
  }
}
