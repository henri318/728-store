import { randomUUID } from 'node:crypto';
import { ConflictError, ValidationError } from '@/shared/kernel/app-error';
import type { CategoryRepository } from '../domain/category-repository';
import type { CategoryEntity } from '../domain/entities/category';
import { CategorySlug } from '../domain/value-objects/category-slug';

export interface CreateCategoryDTO {
  nameEs: string;
  nameCat: string;
}

function normalizeCategoryName(name: string): string {
  return name.trim();
}

export class CreateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(dto: CreateCategoryDTO): Promise<CategoryEntity> {
    const nameEs = normalizeCategoryName(dto.nameEs);
    const nameCat = normalizeCategoryName(dto.nameCat);

    if (!nameEs || !nameCat) {
      throw new ValidationError(
        'Both Spanish and Catalan category names are required',
      );
    }

    let slug: string;
    try {
      slug = CategorySlug.create(nameEs).value;
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
      slug,
      parentId: null,
      createdAt: new Date(),
      translations: [
        { locale: 'es', name: nameEs },
        { locale: 'cat', name: nameCat },
      ],
    };

    return this.categoryRepository.save(category);
  }
}
