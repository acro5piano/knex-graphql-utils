import createKnex from 'knex'

const knexStringcase = require('knex-stringcase')

export const knex = createKnex(
  knexStringcase({
    client: 'pg',
    connection: 'postgres://postgres:postgres@127.0.0.1:11155/postgres',
  }),
)
