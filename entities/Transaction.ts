import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Portfolio } from "./Portfolio";

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Portfolio, { onDelete: "CASCADE" })
  @JoinColumn({ name: "portfolioId" })
  portfolio!: Portfolio;

  @Column()
  portfolioId!: string;

  @Column()
  assetSymbol!: string;

  @Column()
  assetName!: string;

  @Column()
  assetType!: "stock" | "crypto" | "cash" | "other";

  @Column()
  type!: "buy" | "sell" | "deposit" | "withdraw";

  @Column("float")
  quantity!: number;

  @Column("float")
  price!: number;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  date!: Date;

  @Column({ nullable: true })
  notes?: string;

  @Column()
  currency!: string; // e.g., "USD", "EUR", "BTC"

  @Column()
  exchange!: string; // e.g., "NASDAQ", "NYSE", "BINANCE"
}
