fs = require 'fs'
path = require 'path'
{BufferedProcess} = require 'atom'
{XRegExp} = require 'xregexp'

ParserState =
  file: 0
  line: 1
  done: 2
  checkFailedToParse: 3

class LinterMoonscript
  lintProcess: null

  lint: (textEditor) =>
    return new Promise (resolve, reject) =>
      command = @config 'mooncPath'
      file = textEditor.getPath()
      options = {cwd: path.dirname textEditor.getPath()}
      output = []
      curDir = path.dirname file
      args = ['-l', file]
      stdout = (data) ->
        console.log data
      stderr = (err) ->
        output.push err
      exit = (code) =>
        if code is 0
          messages = @parse options.cwd, output.join ''
          resolve messages
        else
          atom.notifications.addError "moonc exited non-zero code",
            dismissable: true
          resolve []

      @lintProcess = new BufferedProcess({command, args, options, stdout, stderr, exit})

  config: (key) ->
    atom.config.get "linter-moonscript.#{key}"

  parse: (cwd, out) ->
    lines = out.split '\n'
    messages = []
    state = ParserState.file
    parsing = true
    currentLine = 0
    currentFile = ''

    while parsing
      switch state
        when ParserState.file
          # parse file name
          currentFile = lines[currentLine]
          currentFile = currentFile.substring 0, currentFile.length - 1
          currentLine += 1
          if currentFile.length > 0
            state = ParserState.checkFailedToParse
          else
            state = ParserState.done

        when ParserState.checkFailedToParse
          if (lines[currentLine]?.indexOf 'Failed to parse:') != -1
            # parse error
            currentLine += 1
            matches = XRegExp.exec lines[currentLine], XRegExp '^ \\[(?<line>[0-9]+)\\] >>'
            if matches?
              matches.line = parseInt matches.line
              message =
                type: 'Error'
                text: 'Syntax error'
                filePath: currentFile
                range: [[matches.line - 1, 0], [matches.line, 0]]
              messages.push message
              state = ParserState.done
            else
              state = ParserState.line
          else
            currentLine += 1
            state = ParserState.line

        when ParserState.line
          # parse lint
          regex = XRegExp 'line (?<line>[0-9]+): (?<message>.+)'
          matches = XRegExp.exec lines[currentLine], regex
          if !matches?
            state = ParserState.done
            continue

          matches.line = parseInt matches.line
          currentLine += 4
          if currentLine >= lines.length
            state = ParserState.done
          else
            # I don't think moonc lints multiple files at once?
            state = ParserState.line

          message =
            type: 'Warning'
            text: matches.message
            filePath: currentFile
            range: [[matches.line - 1, 0], [matches.line, 0]]

          messages.push message

        when ParserState.done
          parsing = false

    return messages

module.exports = LinterMoonscript
