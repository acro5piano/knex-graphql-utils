import type { CreateLoaderProps, OrderByType } from '../BatchLoader'
import { Knex } from 'knex'
import Dataloader from 'dataloader'

type CreateHasManyLoaderProps = Required<
  Pick<CreateLoaderProps, 'targetTable' | 'foreignKey' | 'knex'>
> & {
  modifyQuery?: (query: Knex.QueryBuilder) => void
  orderByType?: OrderByType
  orderByColumn?: string
}

export function createHasManyLoader({
  targetTable,
  foreignKey,
  knex,
  orderByType,
  orderByColumn,
  modifyQuery,
}: CreateHasManyLoaderProps) {
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
