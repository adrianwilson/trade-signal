import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('signals')
export class SignalEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  asset!: string;

  @Column('text')
  assetClass!: string;

  @Column('text')
  direction!: string;

  @Column('integer')
  confidence!: number;

  @Column('text')
  source!: string;

  @Column({ type: 'text', nullable: true })
  reasoning?: string;

  @Column('text')
  timestamp!: string;
}
