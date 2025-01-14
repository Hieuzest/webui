import { App } from 'koishi'
import mock from '@koishijs/plugin-mock'
import * as help from '@koishijs/plugin-help'
import commands from '@koishijs/plugin-commands'
import { expect } from 'chai'

const app = new App()

app.plugin(help)
app.plugin(mock)

const client = app.mock.client('123')

before(() => app.start())
after(() => app.stop())

describe('@koishijs/plugin-commands', () => {
  describe('basic usage', () => {
    it('dispose command', async () => {
      const cmd = app.command('bar').action(() => 'test')

      await client.shouldReply('bar', 'test')
      await client.shouldNotReply('baz')

      app.plugin(commands, {
        bar: 'baz',
      })

      await client.shouldReply('bar', 'test')
      await client.shouldReply('baz', 'test')

      cmd.dispose()

      await client.shouldNotReply('bar')
      await client.shouldNotReply('baz')

      app.dispose(commands)
    })

    it('dispose plugin', async () => {
      app.plugin(commands, {
        bar: 'baz',
      })

      await client.shouldNotReply('bar')
      await client.shouldNotReply('baz')

      const cmd = app.command('bar').action(() => 'test')

      await client.shouldReply('bar', 'test')
      await client.shouldReply('baz', 'test')

      app.dispose(commands)

      await client.shouldReply('bar', 'test')
      await client.shouldNotReply('baz')

      cmd.dispose()
    })
  })

  describe('subcommand', () => {
    it('leaf to root', async () => {
      const foo = app.command('foo')
      const bar = app.command('foo/bar').action(() => 'test')
      expect(foo.children).to.have.length(1)

      app.plugin(commands, {
        'bar': '/baz',
      })

      expect(foo.children).to.have.length(0)
      await client.shouldReply('bar', 'test')
      await client.shouldReply('baz', 'test')

      app.dispose(commands)
      await client.shouldReply('bar', 'test')
      await client.shouldNotReply('baz')
      expect(foo.children).to.have.length(1)

      foo.dispose()
      bar.dispose()
    })

    it('root to leaf', async () => {
      const foo = app.command('foo')
      const bar = app.command('bar').action(() => 'test')
      expect(foo.children).to.have.length(0)

      app.plugin(commands, {
        bar: 'foo/baz',
      })

      expect(foo.children).to.have.length(1)
      await client.shouldReply('bar', 'test')
      await client.shouldReply('baz', 'test')

      app.dispose(commands)
      await client.shouldReply('bar', 'test')
      await client.shouldNotReply('baz')
      expect(foo.children).to.have.length(0)

      foo.dispose()
      bar.dispose()
    })

    it('leaf to leaf', async () => {
      const bar = app.command('bar')
      const foo = app.command('bar/foo').action(() => 'test')
      expect(bar.children).to.have.length(1)

      app.plugin(commands, {
        foo: 'baz/foo',
      })

      expect(bar.children).to.have.length(1)
      const baz = app.command('baz')
      expect(bar.children).to.have.length(0)
      expect(baz.children).to.have.length(1)
      await client.shouldReply('foo', 'test')

      baz.dispose()
      expect(bar.children).to.have.length(1)

      app.dispose(commands)
      await client.shouldReply('foo', 'test')
      expect(bar.children).to.have.length(1)
      expect(baz.children).to.have.length(0)

      foo.dispose()
      bar.dispose()
    })
  })

  describe('create', () => {
    it('basic usage', async () => {
      const bar = app.command('bar').action(() => 'test')

      app.plugin(commands, {
        foo: { create: true },
        bar: 'foo/baz',
      })

      const foo = app.command('foo')
      expect(foo.children).to.have.length(1)
      await client.shouldReply('foo', /baz/)
      await client.shouldReply('baz', 'test')

      app.dispose(commands)
      await client.shouldNotReply('foo')
      await client.shouldNotReply('baz')
      await client.shouldReply('bar', 'test')

      bar.dispose()
    })
  })
})
