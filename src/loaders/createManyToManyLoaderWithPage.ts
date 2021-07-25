import type { CreateLoaderProps, OrderByType } from '../BatchLoader'
import { Knex } from 'knex'
import Dataloader from 'dataloader'

type CreateManyToManyLoaderWithPageProps = Required<
  Pick<CreateLoaderProps, 'targetTable' | 'knex' | 'join' | 'page'>
> & {
  modifyQuery?: (query: Knex.QueryBuilder) => void
  orderByType?: OrderByType
  orderByColumn?: string
  joinTable: string
  joinColumn: string
}

export function createManyToManyLoaderWithPage({
  targetTable,
  knex,
  orderByType,
  orderByColumn,
  modifyQuery,
  join,
  joinTable,
  joinColumn,
  page,
}: CreateManyToManyLoaderWithPageProps) {
  return new Dataloader((ids: readonly string[]) => {
    const subQuery = knex(targetTable)
      .select(`${targetTable}.*`, join.from)
      .innerJoin(joinTable, `${targetTable}.id`, join.to)
      .whereIn(join.from, ids)
      .as('_t')
    if (orderByType && orderByColumn) {
      subQuery.rowNumber(
        'relation_index',
        knex.raw(`partition by ?? order by ?? ${orderByType}`, [
          join.from,
          orderByColumn,
        ]),
      )
    } else {
      subQuery.rowNumber(
        'relation_index',
        knex.raw(`partition by ??`, [join.from]),
      )
    }
    const query = knex(subQuery).whereBetween(
      knex.ref('relation_index') as any,
      [page.offset, page.offset + page.limit],
    )
    if (modifyQuery) {
      modifyQuery(query)
    }
    return query.then((rows) =>
      ids.map((id) => rows.filter((row) => row[joinColumn] === id)),
    )
  })
}
