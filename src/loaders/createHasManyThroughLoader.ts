import type { CreateLoaderProps, OrderByType } from '../BatchLoader'
import { Knex } from 'knex'
import Dataloader from 'dataloader'

type CreateHasManyThroughLoaderPageProps = Required<
  Pick<CreateLoaderProps, 'targetTable' | 'knex' | 'join'>
> & {
  modifyQuery?: (query: Knex.QueryBuilder) => void
  orderByType?: OrderByType
  orderByColumn?: string
  joinTable: string
  joinColumn: string
}

export function createHasManyThroughLoader({
  targetTable,
  knex,
  orderByType,
  orderByColumn,
  modifyQuery,
  join,
  joinTable,
  joinColumn,
}: CreateHasManyThroughLoaderPageProps) {
  return new Dataloader((ids: readonly string[]) => {
    const query = knex(targetTable)
      .select(`${targetTable}.*`, join.from)
      .innerJoin(joinTable, `${joinTable}.id`, join.to)
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
