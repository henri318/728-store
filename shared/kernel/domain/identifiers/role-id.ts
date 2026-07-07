import { EntityId } from '@/shared/kernel/domain/value-objects/entity-id';

export class RoleId extends EntityId {
  static create(value: string): RoleId {
    return new RoleId(value);
  }

  private constructor(value: string) {
    super(value);
  }
}
