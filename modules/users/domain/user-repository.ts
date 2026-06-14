export interface UserEntity {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
}

export interface UserRepository {
  save(user: UserEntity): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
}
