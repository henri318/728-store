import { prisma } from '@/shared/infrastructure/prisma';
import type { RoleEntity } from '@/modules/roles/domain/entities/role';
import type { RoleRepository } from '@/modules/roles/domain/role-repository';
import { RoleId } from '@/modules/roles/domain/value-objects/role-id';

interface RoleRow {
  id: string;
  name: string;
  description: string;
}

function toEntity(row: RoleRow): RoleEntity {
  return {
    id: RoleId.create(row.id),
    name: row.name,
    description: row.description,
  };
}

/**
 * Prisma adapter for RoleRepository.
 *
 * Uses raw SQL queries until the Role model is added to schema.prisma (S4).
 * Once the schema includes `model Role`, this adapter will be updated to use
 * typed Prisma client methods (`prisma.role.upsert`, `prisma.role.findMany`, etc.).
 */
export class PrismaRoleRepository implements RoleRepository {
  async save(role: RoleEntity): Promise<RoleEntity> {
    await prisma.$executeRaw`
      INSERT INTO "Role" (id, name, description)
      VALUES (${role.id.value}, ${role.name}, ${role.description})
      ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description
    `;

    return role;
  }

  async findAll(): Promise<RoleEntity[]> {
    const rows = await prisma.$queryRaw<RoleRow[]>`
      SELECT id, name, description FROM "Role" ORDER BY name
    `;

    return rows.map(toEntity);
  }

  async findByName(name: string): Promise<RoleEntity | null> {
    const rows = await prisma.$queryRaw<RoleRow[]>`
      SELECT id, name, description FROM "Role" WHERE name = ${name} LIMIT 1
    `;

    if (rows.length === 0) return null;
    return toEntity(rows[0]);
  }

  async existsByName(name: string): Promise<boolean> {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(SELECT 1 FROM "Role" WHERE name = ${name}) as "exists"
    `;

    return rows[0]?.exists ?? false;
  }
}
