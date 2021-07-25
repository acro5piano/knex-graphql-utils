import type { CreateLoaderProps, OrderByType } from '../BatchLoader'
import { Knex } from 'knex'
import Dataloader from 'dataloader'

type CreateBelongsToLoaderProps = Required<
  Pick<CreateLoaderProps, 'targetTable' | 'knex'>
> & {
  modifyQuery?: (query: Knex.QueryBuilder) => void
  orderByType?: OrderByType
  orderByColumn?: string
}

export function createBelongsToLoader({
  targetTable,
  knex,
  orderByType,
  orderByColumn,
  modifyQuery,
}: CreateBelongsToLoaderProps) {
  return new Dataloader((ids: readonly string[]) => {
    const query = knex(targetTable).whereIn('id', ids)

    if (orderByColumn && orderByType) {
      query.orderBy(orderByColumn, orderByType)
    }
    if (modifyQuery) {
      modifyQuery(query)
    }
    return query.then((rows) =>
      ids.map((id) => rows.find((row) => row.id === id)),
    )
  })
}
