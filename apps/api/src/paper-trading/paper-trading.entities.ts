import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('paper_accounts')
export class PaperAccountEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  userId!: string;

  @Column('text')
  name!: string;

  @Column('real')
  startingBalance!: number;

  @Column('real')
  cashBalance!: number;

  @Column('text')
  createdAt!: string;
}

@Entity('paper_trades')
export class PaperTradeEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  accountId!: string;

  @Column('text')
  asset!: string;

  @Column('text')
  assetClass!: string;

  @Column('text')
  side!: string;

  @Column('real')
  quantity!: number;

  @Column('real')
  entryPrice!: number;

  @Column({ type: 'real', nullable: true })
  exitPrice!: number | null;

  @Column('text')
  status!: string;

  @Column({ type: 'text', nullable: true })
  signalId!: string | null;

  @Column({ type: 'text', nullable: true })
  signalSource!: string | null;

  @Column('integer')
  confidence!: number;

  @Column({ type: 'text', nullable: true })
  reasoning!: string | null;

  @Column('text')
  enteredAt!: string;

  @Column({ type: 'text', nullable: true })
  exitedAt!: string | null;

  @Column({ type: 'real', nullable: true })
  pnl!: number | null;

  @Column({ type: 'real', nullable: true })
  pnlPercent!: number | null;
}
