import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('asset_prices')
export class AssetPriceEntity {
  @PrimaryColumn('text')
  symbol!: string;

  @Column('real')
  price!: number;

  @Column('real')
  changePercent!: number;

  @Column({ type: 'integer', nullable: true })
  volume!: number | null;

  @Column('text')
  updatedAt!: string;
}
