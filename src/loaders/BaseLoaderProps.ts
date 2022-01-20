import type { CreateLoaderProps, OrderByType } from '../BatchLoader'
import { Knex } from 'knex'

export type BaseLoaderProps<
  TKey extends keyof CreateLoaderProps = 'targetTable',
> = Required<Pick<CreateLoaderProps, 'targetTable' | 'knex' | TKey>> & {
  modifyQuery?: (query: Knex.QueryBuilder) => void
  modifyInnerQuery?: (query: Knex.QueryBuilder) => void
  orderByType?: OrderByType
  orderByColumn?: string
}

export type BaseJoinableLoaderProps<
  TKey extends keyof CreateLoaderProps = 'targetTable',
> = BaseLoaderProps<'join' | TKey> & {
  joinTable: string
  joinColumn: string
}
