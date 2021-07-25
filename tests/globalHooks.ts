import test from 'ava'

import { knex, knexWithLog } from './knex'
import { users, posts, comments } from './fixtures.json'

test.before(async () => {
  Object.assign(global, {
    log: (a: any) => console.log(JSON.stringify(a, undefined, 2)),
  })

  await knex.raw(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  `)
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'))
    t.string('name').notNullable()
    t.string('email')
    t.timestamps(true, true)
  })
  await knex.schema.createTable('posts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'))
    t.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE')
    t.string('title').notNullable()
    t.timestamps(true, true)
  })
  await knex.schema.createTable('comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'))
    t.uuid('post_id').notNullable().references('posts.id').onDelete('CASCADE')
    t.string('content').notNullable()
    t.timestamps(true, true)
  })

  // This initialize knex
  await knexWithLog.raw("select 'Hey start'")

  await knex('users').insert(users)
  await knex('posts').insert(posts)
  await knex('comments').insert(comments)
})

test.after(async () => {
  await knexWithLog.destroy()
  await knex.destroy()
})
