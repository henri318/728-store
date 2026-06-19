import { prisma } from '@/shared/infrastructure/prisma';
import type { RoleEntity } from '@/modules/roles/domain/entities/role';
import type { RoleRepository } from '@/modules/roles/domain/role-repository';
import { RoleId } from '@/modules/roles/domain/value-objects/role-id';

function toEntity(row: { id: string; name: string; description: string }): RoleEntity {
  return {
    id: RoleId.create(row.id),
    name: row.name,
    description: row.description,
  };
}

/**
 * Prisma adapter for RoleRepository using typed Prisma client.
 *
 * Relies on the `Role` model defined in prisma/schema.prisma.
 * No raw SQL — all queries use the type-safe Prisma client.
 */
export class PrismaRoleRepository implements RoleRepository {
  async save(role: RoleEntity): Promise<RoleEntity> {
    const row = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: {
        id: role.id.value,
        name: role.name,
        description: role.description,
      },
    });

    return toEntity(row);
  }

  async findAll(): Promise<RoleEntity[]> {
    const rows = await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });

    return rows.map(toEntity);
  }

  async findByName(name: string): Promise<RoleEntity | null> {
    const row = await prisma.role.findUnique({
      where: { name },
    });

    if (!row) return null;
    return toEntity(row);
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await prisma.role.count({
      where: { name },
    });

    return count > 0;
  }
}
