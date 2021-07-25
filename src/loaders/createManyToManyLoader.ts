import type { BaseJoinableLoaderProps } from './BaseLoaderProps'

import Dataloader from 'dataloader'

export function createManyToManyLoader({
  targetTable,
  knex,
  orderByType,
  orderByColumn,
  modifyQuery,
  join,
  joinTable,
  joinColumn,
}: BaseJoinableLoaderProps) {
  return new Dataloader((ids: readonly string[]) => {
    const query = knex(targetTable)
      .select(`${targetTable}.*`, join.from)
      .innerJoin(joinTable, `${targetTable}.id`, join.to)
      .whereIn(join.from, ids)
    if (orderByColumn && orderByType) {
      query.orderBy(orderByColumn, orderByType)
    }
    if (modifyQuery) {
      modifyQuery(query)
    }
    return query.then((rows) =>
      ids.map((id) => rows.filter((row) => row[joinColumn] === id)),
    )
  })
}
