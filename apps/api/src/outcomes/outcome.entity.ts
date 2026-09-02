import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('signal_outcomes')
export class OutcomeEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  signalId!: string;

  @Column('text')
  asset!: string;

  @Column('text')
  assetClass!: string;

  @Column('text')
  source!: string;

  @Column('text')
  direction!: string;

  @Column('real')
  priceAtSignal!: number;

  @Column({ type: 'real', nullable: true })
  priceAfterDays!: number | null;

  @Column('integer')
  evaluationDays!: number;

  @Column('text')
  outcome!: string; // 'correct' | 'incorrect' | 'pending'

  @Column('text')
  signalTimestamp!: string;

  @Column({ type: 'text', nullable: true })
  evaluatedAt!: string | null;
}
