import { Watcher } from 'casbin'
import { MongoClient, MongoClientOptions, ChangeStream, Document, ChangeStreamDocument, ChangeStreamOptions } from 'mongodb'
import { MongoChangeStreamWatcherError } from './errors'

interface Logger {
  trace: (message?: any, ...optionalParams: any[]) => void
  debug: (message?: any, ...optionalParams: any[]) => void
  info: (message?: any, ...optionalParams: any[]) => void
  warn: (message?: any, ...optionalParams: any[]) => void
  error: (message?: any, ...optionalParams: any[]) => void
  [x: string]: any
}

interface MongoChangeStreamWatcherOptions {
  readonly collectionName?: string
  readonly dbName?: string
  readonly callbackStreamCloseEvent?: boolean
  readonly waitStreamReady?: boolean
  clientOptions?: MongoClientOptions
  streamOptions?: ChangeStreamOptions
  streamAgregator?: Document[]
  logger?: Logger
}

export class MongoChangeStreamWatcher implements Watcher {
  private client: MongoClient
  private logger: Logger | undefined
  private changeStream: ChangeStream
  private loggerEnabled: boolean = false
  private callbackClose: boolean = false

  private callback: (...args: any[]) => void

  /**
   * Generates a new watcher for a MongoDB databae.
   * @param {string} url URL to MongoDB Replica Set / Sharded Cluster
   * @param {MongoChangeStreamWatcherOptions} options Different options for connecting and managing the stream
   * @returns {Promise<MongoChangeStreamWatcher>} Promise for connected watcher
   */
  public static async newWatcher (url: string, options?: MongoChangeStreamWatcherOptions): Promise<MongoChangeStreamWatcher> {
    return await this.init(url, options)
  }

  private constructor () {
  }

  private changeStreamHandler (change: ChangeStreamDocument<Document>): void {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    if (this.loggerEnabled && this.logger != null) this.logger.debug(`Received a change. ID: ${(change?._id as any)?._data}, type: ${change?.operationType}`)
    if (this.callback !== undefined) {
      this.callback(change)
    }
  }

  /**
   * Returns close stream event if enabled during initialization.
   * @returns {void}
   */
  private closeStreamHandler (): void {
    if (this.loggerEnabled && this.logger != null) this.logger.debug('Received a close event')
    if (this.callbackClose && this.callback !== undefined) {
      this.callback({ operationType: 'close' })
    }
  }

  /**
   * Toggles internal logger either on or off
   * @returns {boolean} Whether logger is enabled or not
   */
  public toggleLogger (): boolean {
    if (this.logger !== undefined) {
      this.loggerEnabled = !this.loggerEnabled
      return this.loggerEnabled
    } else {
      this.loggerEnabled = false
      return this.loggerEnabled
    }
  }

  private static async init (url: string, options?: MongoChangeStreamWatcherOptions): Promise<MongoChangeStreamWatcher> {
    if (url == null || url === '') {
      throw new MongoChangeStreamWatcherError('You must provide Mongo URL to connect to!')
    }
    const watcher = new MongoChangeStreamWatcher()
    watcher.client = new MongoClient(url, options?.clientOptions)
    watcher.logger = (options?.logger != null) ? options.logger : console
    watcher.callbackClose = options?.callbackStreamCloseEvent === true

    await watcher.client.connect()
    const collectionName = options?.collectionName == null ? 'casbin' : options.collectionName
    const collection = watcher.client.db(options?.dbName).collection(collectionName)

    watcher.changeStream = collection.watch(options?.streamAgregator, options?.streamOptions)
    watcher.changeStream.on('change', (next) => watcher.changeStreamHandler(next))
    watcher.changeStream.on('close', (next: any) => watcher.closeStreamHandler())
    if (options?.waitStreamReady !== false) await this.streamReady(watcher.changeStream)
    return watcher
  }

  /**
   * Checks that stream is ready before returning.
   * https://stackoverflow.com/questions/56699849/how-do-i-know-when-a-stream-node-js-mongodb-is-ready-for-changes
   * https://jira.mongodb.org/browse/NODE-2247
   * @param stream MongoDB Change Stream
   * @returns {Promise<void>}
   */
  private static async streamReady (stream: any): Promise<void> {
    return await new Promise<void>((resolve) => {
      const i = setInterval(() => {
        if (stream.cursor.startAtOperationTime != null) {
          clearInterval(i)
          return resolve()
        }
      }, 1)
    })
  }

  /**
   * Using the update-function is not necessary since updates are handled automatically by the change stream.
   * @returns {boolean} false
   */
  public async update (): Promise<boolean> {
    if (this.loggerEnabled && this.logger != null) this.logger.info('Update call is handled by the MongoDB Change Stream.')
    return false
  }

  public setUpdateCallback (callback: (...args: any[]) => void): void {
    this.callback = callback
  }

  public async close (): Promise<void> {
    await this.changeStream.close()
    await this.client.close()
  }
}
