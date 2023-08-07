# Node-Casbin Watcher based on MongoDB Change Streams

[![NPM version][npm-image]][npm-url]
[![NPM download][download-image]][download-url]
[![codebeat badge](https://codebeat.co/badges/6a941388-2e36-408b-952e-2bd227e3997c)](https://codebeat.co/projects/github-com-node-casbin-mongo-changestream-watcher-master)
[![Coverage Status](https://coveralls.io/repos/github/node-casbin/mongo-changestream-watcher/badge.svg?branch=master)](https://coveralls.io/github/node-casbin/mongo-changestream-watcher?branch=master)
[![Discord](https://img.shields.io/discord/1022748306096537660?logo=discord&label=discord&color=5865F2)](https://discord.gg/S5UjpzGZjN)
[![tests](https://github.com/node-casbin/mongo-changestream-watcher/actions/workflows/main.yml/badge.svg)](https://github.com/node-casbin/mongo-changestream-watcher/actions/workflows/main.yml)

[npm-image]: https://img.shields.io/npm/v/@casbin/mongo-changestream-watcher.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@casbin/mongo-changestream-watcher
[download-image]: https://img.shields.io/npm/dm/@casbin/mongo-changestream-watcher.svg?style=flat-square
[download-url]: https://npmjs.org/package/@casbin/mongo-changestream-watcher

For more information about MongoDB Change Streams, look [here](https://www.mongodb.com/docs/manual/changeStreams/).

More information about Casbin Watchers, look [here](https://casbin.org/docs/watchers).

## Installation

```shell script
# NPM
npm install --save @casbin/mongo-changestream-watcher

# Yarn
yarn add @casbin/mongo-changestream-watcher
```

## Simple Example using Mongoose Adapter

```typescript
import { MongoChangeStreamWatcher } from '@casbin/mongo-changestream-watcher';
import { newEnforcer } from 'casbin';

// Initialize the watcher by connecting to a replica set.
const watcher = await MongoChangeStreamWatcher.newWatcher('mongodb://localhost:27001,localhost:27002/casbin?replicaSet=rs0', {collectionName: 'casbin_rule'});
const adapter = await MongooseAdapter.newAdapter('mongodb://localhost:27001,localhost:27002/casbin?replicaSet=rs0');
const enforcer = await newEnforcer('test/fixtures/basic_model.conf', adapter);

// Initialize the enforcer.
const enforcer = await newEnforcer('examples/authz_model.conf', 'examples/authz_policy.csv');

enforcer.setWatcher(watcher);

// By default, the watcher's callback is automatically set to the
// enforcer's loadPolicy() in the setWatcher() call.
// We can change it by explicitly setting a callback.
watcher.setUpdateCallback(() => console.log('Casbin need update'));
```

## Notes

This watcher does not operate with `update`-calls typically found in other watchers. Mongo Change Stream directly reacts to changes in the database collection, and therefore all other watchers listening to the same stream will be automatically notified when changes do occur. However, this means that watcher also gets notified by its own changes.
