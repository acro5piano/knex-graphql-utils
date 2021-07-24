import createKnex from 'knex'
import { knexLittleLogger } from 'knex-little-logger'

const knexStringcase = require('knex-stringcase')

const options = knexStringcase({
  client: 'pg',
  connection: 'postgres://postgres:postgres@127.0.0.1:11155/postgres',
})

export const knexWithLog = createKnex(options)

knexLittleLogger(knexWithLog)

export const knex = createKnex(options)
