export interface EmailUserLookupSnapshot {
  email: string;
  firstName: string;
  locale: string;
}

export interface EmailUserLookupPort {
  findById(userId: string): Promise<EmailUserLookupSnapshot | null>;
  findEmailByUserId(userId: string): Promise<string | null>;
}
