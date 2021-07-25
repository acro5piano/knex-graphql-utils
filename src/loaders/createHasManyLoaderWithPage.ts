import type { BaseLoaderProps } from './BaseLoaderProps'

import Dataloader from 'dataloader'

export function createHasManyLoaderWithPage({
  targetTable,
  foreignKey,
  knex,
  page,
  orderByType,
  orderByColumn,
  modifyQuery,
}: BaseLoaderProps<'page' | 'foreignKey'>) {
  return new Dataloader((ids: readonly string[]) => {
    const subQuery = knex(targetTable)
      .select('*')
      .whereIn(foreignKey, ids)
      .as('_t')
    if (orderByType && orderByColumn) {
      subQuery.rowNumber(
        'relation_index',
        knex.raw(`partition by ?? order by ?? ${orderByType}`, [
          foreignKey,
          orderByColumn,
        ]),
      )
    } else {
      subQuery.rowNumber(
        'relation_index',
        knex.raw(`partition by ??`, [foreignKey]),
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
      ids.map((id) => rows.filter((row) => row[foreignKey] === id)),
    )
  })
}
