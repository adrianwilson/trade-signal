import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('alerts')
export class AlertEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  userId!: string;

  @Column('text')
  asset!: string;

  @Column('text')
  direction!: string;

  @Column('integer')
  confidence!: number;

  @Column('text')
  message!: string;

  @Column({ type: 'integer', default: 0 })
  read!: number;

  @Column('text')
  createdAt!: string;
}
