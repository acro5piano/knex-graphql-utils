import type { BaseLoaderProps } from './BaseLoaderProps'
import Dataloader from 'dataloader'

export function createBelongsToLoader({
  targetTable,
  knex,
  orderByType,
  orderByColumn,
  modifyQuery,
}: BaseLoaderProps) {
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
