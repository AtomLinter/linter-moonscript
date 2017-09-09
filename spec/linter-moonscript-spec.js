'use babel';

// eslint-disable-next-line no-unused-vars
import { it, fit, wait, beforeEach, afterEach } from 'jasmine-fix';
import { join } from 'path';

import { provideLinter } from '../lib/init';

const goodPath = join(__dirname, 'fixtures', 'good.moon');
const badPath = join(__dirname, 'fixtures', 'bad.moon');
const parseFailPath = join(__dirname, 'fixtures', 'parseFail.moon');

const { lint } = provideLinter();

describe('The Moonscript provider for Linter', () => {
  describe('works with Moonscript files and', () => {
    beforeEach(async () => {
      const activationPromise = atom.packages.activatePackage('linter-moonscript');

      await atom.packages.activatePackage('language-moonscript');
      await atom.workspace.open(goodPath);
      atom.packages.triggerDeferredActivationHooks();
      await activationPromise;
    });

    it('finds nothing wrong with a good file', async () => {
      const editor = await atom.workspace.open(goodPath);
      const messages = await lint(editor);

      expect(messages.length).toBe(0);
    });

    it('handles parse failures', async () => {
      const editor = await atom.workspace.open(parseFailPath);
      const messages = await lint(editor);

      expect(messages.length).toBe(1);
      expect(messages[0].type).toBe('Error');
      expect(messages[0].severity).toBe('error');
      expect(messages[0].html).not.toBeDefined();
      expect(messages[0].text).toBe('Syntax error');
      expect(messages[0].filePath).toBe(parseFailPath);
      expect(messages[0].range).toEqual([[0, 0], [0, 19]]);
    });

    it('handles regular warnings', async () => {
      const editor = await atom.workspace.open(badPath);
      const messages = await lint(editor);

      expect(messages.length).toBe(2);

      expect(messages[0].type).toBe('Warning');
      expect(messages[0].severity).toBe('warning');
      expect(messages[0].html).not.toBeDefined();
      expect(messages[0].text).toBe('accessing global `my_nmuber`');
      expect(messages[0].filePath).toBe(badPath);
      expect(messages[0].range).toEqual([[5, 4], [5, 18]]);

      expect(messages[1].type).toBe('Warning');
      expect(messages[1].severity).toBe('warning');
      expect(messages[1].html).not.toBeDefined();
      expect(messages[1].text).toBe('assigned but unused `my_number`');
      expect(messages[1].filePath).toBe(badPath);
      expect(messages[1].range).toEqual([[0, 0], [0, 16]]);
    });
  });
});
