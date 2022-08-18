import { MongoChangeStreamWatcher } from '../../src/watcher'

describe('MongoChangeStreamWatcher', () => {
  test('Should have implemented interface for node-casbin', async () => {
    expect(typeof MongoChangeStreamWatcher.newWatcher).toBe('function')
  })
  test('Not defining URL should throw an error', async () => {
    await expect(MongoChangeStreamWatcher.newWatcher(''))
      .rejects
      .toThrow('You must provide Mongo URL to connect to!')
  })
})
