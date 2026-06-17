import { EntityId } from '@/shared/kernel/domain/value-objects/entity-id';

export class RoleId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): RoleId {
    return new RoleId(value);
  }
}
