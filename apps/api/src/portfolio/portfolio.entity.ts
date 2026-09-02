import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('portfolio')
export class PortfolioEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  userId!: string;

  @Column('text')
  asset!: string;

  @Column('text')
  assetClass!: string;

  @Column('real')
  quantity!: number;

  @Column('real')
  avgPrice!: number;

  @Column('text')
  addedAt!: string;
}
