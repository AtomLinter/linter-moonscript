{CompositeDisposable} = require 'atom'

module.exports =
  config:
    mooncPath:
      type: 'string'
      default: 'moonc'
      description: 'Path to moonscript compiler.'

  activate: ->
    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.config.observe 'linter-moonscript.mooncPath', (mooncPath) =>
      @mooncPath = mooncPath

  deactivate: ->
    @subscriptions.dispose()

  provideLinter: ->
    LinterMoonscript = require('./linter-moonscript')
    @provider = new LinterMoonscript()
    return {
      grammarScopes: ['source.moon']
      scope: 'file'
      lint: @provider.lint
      lintOnFly: false
    }
