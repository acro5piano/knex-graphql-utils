import type { BaseLoaderProps } from './BaseLoaderProps'

import Dataloader from 'dataloader'

export function createHasManyLoader({
  targetTable,
  foreignKey,
  knex,
  orderByType,
  orderByColumn,
  modifyQuery,
}: BaseLoaderProps<'foreignKey'>) {
  return new Dataloader((ids: readonly string[]) => {
    const query = knex(targetTable).whereIn(foreignKey, ids)

    if (orderByColumn && orderByType) {
      query.orderBy(orderByColumn, orderByType)
    }

    if (modifyQuery) {
      modifyQuery(query)
    }
    return query.then((rows) =>
      ids.map((id) => rows.filter((row) => row[foreignKey] === id)),
    )
  })
}
