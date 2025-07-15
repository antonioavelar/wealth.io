import { EntityManager } from "@mikro-orm/core";
import { User } from "@/entities/User";
import { AppDataSource } from "@/lib/typeorm";

export class UserRepository {
  private em: EntityManager;

  constructor(em: EntityManager) {
    this.em = em;
  }

  async findByEmail(email: string) {
    return this.em.findOne(User, { email });
  }

  async createUser(email: string, password: string) {
    const user = this.em.create(User, {
      email,
      password,
      preferredCurrency: "USD",
      createdAt: new Date(),
    });
    await this.em.persistAndFlush(user);
    return user;
  }

  static async updatePreferredCurrency(
    userId: string,
    preferredCurrency: string
  ) {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ id: userId });
    if (!user) return null;
    user.preferredCurrency = preferredCurrency;
    await userRepo.save(user);
    return user;
  }
}
