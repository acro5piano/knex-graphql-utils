import test from 'ava'
import { knexWithLog } from './knex'
import { SelectionFilter } from '../src'
import {
  graphql,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLSchema,
  GraphQLObjectType,
} from 'graphql'

const gql = String.raw

test.serial('SelectionFilter', async (t) => {
  const selectionFilter = new SelectionFilter(knexWithLog)
  await selectionFilter.prepare(['users', 'posts'], /_id$/)

  const Post = new GraphQLObjectType({
    name: 'Post',
    fields: {
      id: { type: GraphQLID },
      title: { type: GraphQLString },
      createdAt: { type: GraphQLString },
      updatedAt: { type: GraphQLString },
    },
  })

  const User = new GraphQLObjectType({
    name: 'User',
    fields: {
      id: { type: GraphQLID },
      name: { type: GraphQLString },
      createdAt: { type: GraphQLString },
      updatedAt: { type: GraphQLString },
      posts: {
        type: new GraphQLList(Post),
        resolve: (user, _args, _ctx, info) =>
          knexWithLog('posts')
            .where({ userId: user.id })
            .select(
              selectionFilter.reduce({
                info,
                table: 'posts',
              }),
            ),
      },
    },
  })

  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        user: {
          type: User,
          resolve: (_root, _args, _ctx, info) =>
            knexWithLog('users')
              .select(
                selectionFilter.reduce({
                  info,
                  table: 'users',
                }),
              )
              .first(),
        },
      },
    }),
  })

  knexWithLog.on('query', (q) => {
    t.snapshot(q.sql)
  })

  await graphql({
    schema,
    source: gql`
      query {
        user {
          id
          name
          posts {
            id
            createdAt
          }
        }
      }
    `,
  }).then(t.snapshot)
})
