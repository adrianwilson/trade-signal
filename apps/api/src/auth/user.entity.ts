import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text', unique: true })
  email!: string;

  @Column('text')
  password!: string;

  @Column('text')
  createdAt!: string;
}
