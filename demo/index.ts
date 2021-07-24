import Fastify from 'fastify'
import { GraphQLResolveInfo } from 'graphql'
import mercurius from 'mercurius'
import { BatchLoader, SelectionFilter } from '../src'
import { users, posts } from '../tests/fixtures.json'

import { knex } from './knex' // Your knex instance
import type { Knex } from 'knex'

const app = Fastify()

const schema = `
  type Query {
    users: [User!]!
    user: User
  }
  type User {
    id: ID!
    name: String
    posts(page: Int!): [Post!]!
    createdAt: String!
  }
  type Post {
    id: ID!
    title: String
    user: User!
  }
`

const selectionFilter = new SelectionFilter(knex)

const resolvers = {
  Query: {
    users: (_user: any, _args: any, _ctx: any, info: GraphQLResolveInfo) =>
      knex('users')
        .select(
          selectionFilter.filterGraphQLSelections({
            info,
            table: 'users',
          }),
        )
        .limit(10),
    user: (_user: any, _args: any, _ctx: any, info: GraphQLResolveInfo) =>
      knex('users')
        .select(
          selectionFilter.filterGraphQLSelections({
            info,
            table: 'users',
          }),
        )
        .first(),
  },
  User: {
    posts: (user: any, args: any, ctx: any, info: GraphQLResolveInfo) =>
      ctx.batchLoader
        .getLoader({
          type: 'hasMany',
          foreignKey: 'userId',
          targetTable: 'posts',
          page: {
            offset: ((args.page || 1) - 1) * 10,
            limit: 10,
          },
          orderBy: ['createdAt', 'asc'],
          queryModifier: (query: Knex) => {
            query.select(
              selectionFilter.filterGraphQLSelections({
                info,
                table: 'posts',
              }),
            )
          },
        })
        .load(user.id),
  },
  Post: {
    user: (post: any, _args: any, ctx: any, info: GraphQLResolveInfo) =>
      ctx.batchLoader
        .getLoader({
          type: 'belongsTo',
          foreignKey: 'userId',
          targetTable: 'users',
          queryModifier: (query: Knex) => {
            query.select(
              selectionFilter.filterGraphQLSelections({
                info,
                table: 'users',
              }),
            )
          },
        })
        .load(post.userId),
  },
}

app.addHook('onReady', async () => {
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
  await selectionFilter.prepare(['users', 'posts'], /(_id)|(Id)$/)

  await knex('users').insert(users)
  await knex('posts').insert(posts)

  console.log('\n\n=> Open http://localhost:8877/graphiql')
})

app.register(mercurius, {
  schema,
  resolvers,
  context: () => ({
    batchLoader: new BatchLoader(knex),
  }),
  graphiql: true,
})

app.listen(8877)
