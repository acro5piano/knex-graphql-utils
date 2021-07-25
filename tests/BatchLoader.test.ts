import test from 'ava'
import { knexWithLog } from './knex'
import { users, posts } from './fixtures.json'
import { BatchLoader } from '../src/index'

test.serial('BatchLoader - hasMany with custom select', async (t) => {
  const batchLoader = new BatchLoader(knexWithLog)
  const loader = () =>
    batchLoader.getLoader({
      foreignKey: 'userId',
      page: { offset: 5, limit: 10 },
      targetTable: 'posts',
      type: 'hasMany',
      orderBy: ['createdAt', 'asc'],
      queryModifier: (query) => {
        query.select('id', 'userId', 'createdAt').orderBy('createdAt')
      },
    })
  await Promise.all([
    loader().load(users[0]!.id),
    loader().load(users[1]!.id),
  ]).then(t.snapshot)
})

test.serial('BatchLoader - hasMany with pagination', async (t) => {
  const batchLoader = new BatchLoader(knexWithLog)
  const loader = () =>
    batchLoader.getLoader({
      foreignKey: 'userId',
      page: { offset: 5, limit: 10 },
      targetTable: 'posts',
      type: 'hasMany',
      orderBy: ['createdAt', 'asc'],
    })
  await Promise.all([
    loader().load(users[0]!.id),
    loader().load(users[1]!.id),
    loader().load(users[2]!.id),
    loader().load(users[3]!.id),
    loader().load(users[4]!.id),
  ]).then(t.snapshot)
})

test.serial('BatchLoader - hasMany without pagination', async (t) => {
  const batchLoader = new BatchLoader(knexWithLog)
  const loader = () =>
    batchLoader.getLoader({
      type: 'hasMany',
      foreignKey: 'userId',
      targetTable: 'posts',
      orderBy: ['createdAt', 'desc'],
    })
  await Promise.all([
    loader().load(users[4]!.id),
    loader().load(users[5]!.id),
  ]).then(t.snapshot)
})

test.serial('BatchLoader - belongsTo', async (t) => {
  const batchLoader = new BatchLoader(knexWithLog)
  const loader = () =>
    batchLoader.getLoader({
      type: 'belongsTo',
      targetTable: 'users',
      orderBy: ['createdAt', 'desc'],
    })
  await Promise.all([
    loader().load(users[0]!.id),
    loader().load(users[1]!.id),
  ]).then(t.snapshot)
})

test.serial('BatchLoader - hasManyThrough with pagination', async (t) => {
  const batchLoader = new BatchLoader(knexWithLog)
  const loader = () =>
    batchLoader.getLoader({
      type: 'hasManyThrough',
      join: {
        from: 'posts.userId',
        to: 'comments.postId',
      },
      page: {
        limit: 3,
        offset: 0,
      },
      targetTable: 'comments',
      orderBy: ['comments.createdAt', 'desc'],
    })
  await Promise.all([
    loader().load(users[0]!.id),
    loader().load(users[1]!.id),
  ]).then(t.snapshot)
})

test.serial('BatchLoader - hasManyThrough without pagination', async (t) => {
  const batchLoader = new BatchLoader(knexWithLog)
  const loader = () =>
    batchLoader.getLoader({
      type: 'hasManyThrough',
      join: {
        from: 'posts.userId',
        to: 'comments.postId',
      },
      targetTable: 'comments',
      orderBy: ['posts.createdAt', 'asc'],
    })
  await Promise.all([
    loader().load(users[0]!.id),
    loader().load(users[1]!.id),
  ]).then(t.snapshot)
})

test.serial('BatchLoader - manyToMany with pagination', async (t) => {
  const batchLoader = new BatchLoader(knexWithLog)
  const loader = () =>
    batchLoader.getLoader({
      type: 'manyToMany',
      join: {
        from: 'tagsPosts.postId',
        to: 'tagsPosts.tagId',
      },
      page: { limit: 5, offset: 0 },
      targetTable: 'tags',
      orderBy: ['tags.createdAt', 'asc'],
    })
  await Promise.all([
    loader().load(posts[0]!.id),
    loader().load(posts[1]!.id),
    loader().load(posts[2]!.id),
  ]).then(t.snapshot)
})

test.serial('BatchLoader - manyToMany without pagination', async (t) => {
  const batchLoader = new BatchLoader(knexWithLog)
  const loader = () =>
    batchLoader.getLoader({
      type: 'manyToMany',
      join: {
        from: 'tagsPosts.postId',
        to: 'tagsPosts.tagId',
      },
      targetTable: 'tags',
      orderBy: ['tags.createdAt', 'asc'],
    })
  await Promise.all([
    loader().load(posts[0]!.id),
    loader().load(posts[1]!.id),
  ]).then(t.snapshot)
})
