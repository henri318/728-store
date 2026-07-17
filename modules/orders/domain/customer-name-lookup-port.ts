export interface CustomerNameLookupPort {
  findById(
    userId: string,
  ): Promise<{ firstName: string; lastName: string } | null>;
}
