class MongoChangeStreamWatcherError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'MongoChangeStreamWatcherError'
  }
}

export { MongoChangeStreamWatcherError }
