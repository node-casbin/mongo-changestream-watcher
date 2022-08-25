import { newEnforcer, Enforcer } from 'casbin'
import { MongooseAdapter, CasbinRule } from 'casbin-mongoose-adapter'
import { MongoChangeStreamWatcher } from '../../src/watcher'

describe('Watcher Tests', () => {
  let enforcer: Enforcer, watcher: MongoChangeStreamWatcher, watcher2: MongoChangeStreamWatcher, adapter: MongooseAdapter
  beforeAll(async () => {
    adapter = await MongooseAdapter.newAdapter('mongodb://localhost:27001,localhost:27002/casbin?replicaSet=rs0')
    await CasbinRule.deleteMany()
    enforcer = await newEnforcer('test/fixtures/basic_model.conf', adapter)
  })

  it('Setting a stream to non-existant collection should succeed', async () => {
    watcher = await MongoChangeStreamWatcher.newWatcher('mongodb://localhost:27001,localhost:27002?replicaSet=rs0', { logger: console, dbName: 'casbin' })
    await watcher.close()
    watcher = await MongoChangeStreamWatcher.newWatcher('mongodb://localhost:27001,localhost:27002/casbin?replicaSet=rs0')
    // @ts-expect-error
    expect(watcher.client.db().databaseName).toBe('casbin')
    await watcher.close()
  })

  it('Setting a stream to existing collection should succeed', async () => {
    watcher = await MongoChangeStreamWatcher.newWatcher('mongodb://localhost:27001,localhost:27002/casbin?replicaSet=rs0', { collectionName: 'casbin_rule' })
    // @ts-expect-error
    const namespace = watcher.changeStream.namespace
    expect(namespace.db).toBe('casbin')
    expect(namespace.collection).toBe('casbin_rule')
  })

  it('Callback should not crash', async () => {
    expect(watcher.toggleLogger()).toBe(true)
    // @ts-expect-error
    expect(watcher.changeStreamHandler()).toBe(undefined)
    // @ts-expect-error
    expect(watcher.changeStreamHandler({})).toBe(undefined)
    expect(watcher.toggleLogger()).toBe(false)
  })

  it('Callback is called', async () => {
    return await new Promise<void>((resolve) => {
      enforcer.setWatcher(watcher)
      // @ts-expect-error
      const spyDebug = jest.spyOn(watcher?.logger, 'debug')
      expect(watcher.toggleLogger()).toBe(true)
      watcher.setUpdateCallback(() => {
        expect(spyDebug).toBeCalled()
        resolve()
      })
      void enforcer.addPolicy('sub', 'obj', 'act')
    })
  })

  it('Callback is called in both watchers', async () => {
    enforcer = await newEnforcer('test/fixtures/basic_model.conf', adapter)
    watcher = await MongoChangeStreamWatcher.newWatcher('mongodb://localhost:27001,localhost:27002/casbin?replicaSet=rs0', { collectionName: 'casbin_rule' })
    watcher2 = await MongoChangeStreamWatcher.newWatcher('mongodb://localhost:27001,localhost:27002/casbin?replicaSet=rs0', { collectionName: 'casbin_rule' })
    const wprom = new Promise<void>((resolve) => {
      watcher.setUpdateCallback(() => {
        resolve()
      })
    })
    const w2prom = new Promise<void>((resolve) => {
      watcher2.setUpdateCallback(() => {
        resolve()
      })
    })
    expect(await enforcer.addPolicy('sub1', 'obj1', 'act')).toBe(true)
    return await Promise.all([wprom, w2prom])
  })

  test('Logger should not get enabled when it is undefined', async () => {
    // @ts-expect-error
    watcher.logger = undefined
    expect(watcher.toggleLogger()).toBe(false)
    // @ts-expect-error
    watcher.logger = console
    expect(watcher.toggleLogger()).toBe(true)
  })

  afterAll(async () => {
    await CasbinRule.deleteMany()
    await watcher2?.close()
    await watcher?.close()
    await adapter?.close()
  })
})
