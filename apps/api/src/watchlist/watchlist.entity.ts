import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('watchlist')
export class WatchlistEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  userId!: string;

  @Column('text')
  asset!: string;

  @Column('text')
  assetClass!: string;

  @Column('text')
  addedAt!: string;
}
