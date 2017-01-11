'use babel';

import { dirname } from 'path';
import * as helpers from 'atom-linter';

// eslint-disable-next-line import/extensions, import/no-extraneous-dependencies
import { CompositeDisposable } from 'atom';

const parseRegex = /^(?:line)? \[?(\d+)]?(?:: (.+))?/gm;
const globalRegex = /accessing global/g;
let executablePath;
let omitGlobalCheck;

export default {
  activate() {
    require('atom-package-deps').install('linter-moonscript');

    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.config.observe('linter-moonscript.executablePath',
      (value) => {
        executablePath = value;
      },
    ));
    this.subscriptions.add(atom.config.observe('linter-moonscript.omitGlobalCheck',
      (value) => {
        omitGlobalCheck = value;
      },
    ));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  provideLinter() {
    return {
      name: 'Moonscript',
      grammarScopes: ['source.moon'],
      scope: 'file',
      lintOnFly: false,
      lint: async (textEditor) => {
        const filePath = textEditor.getPath();
        const fileText = textEditor.getText();

        const execArgs = ['-l', filePath];
        const execOpts = {
          cwd: dirname(filePath),
          stream: 'stderr',
          ignoreExitCode: true,
          allowEmptyStderr: true,
        };

        const result = await helpers.exec(executablePath, execArgs, execOpts);

        if (textEditor.getText() !== fileText) {
          // File contents changed since lint started, print a warning to the console
          // eslint-disable-next-line no-console
          console.warn('linter-moonscript:: The file was modified since the ' +
            'request was sent to check it. Since any results would no longer ' +
            'be valid, they are not being updated. Please save the file ' +
            'again to update the results.');
          return null;
        }

        const messages = [];
        let match = parseRegex.exec(result);
        while (match !== null) {
          // Convert the line to 0-indexed for Atom
          const line = Number.parseInt(match[1], 10) - 1;

          if (match[2] === undefined) {
            // Syntax error, failed to parse
            /**
             * Note: `moonc` itself just prints the entire line, no point in
             * grabbing the entire line from it's output to put in the message
             * when we can just determine the range ourselves.
             */
            messages.push({
              type: 'Error',
              severity: 'error',
              filePath,
              text: 'Syntax error',
              range: helpers.rangeFromLineNumber(textEditor, line),
            });
          } else {
            if (!omitGlobalCheck || !globalRegex.test(match[2])) {
              // Regular lint warning
              messages.push({
                type: 'Warning',
                severity: 'warning',
                filePath,
                text: match[2],
                range: helpers.rangeFromLineNumber(textEditor, line),
              });
            }
          }

          // Grab the next match in the output
          match = parseRegex.exec(result);
        }
        return messages;
      },
    };
  },
};
