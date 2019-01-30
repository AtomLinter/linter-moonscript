'use babel';

import {
  // eslint-disable-next-line no-unused-vars
  it, fit, wait, beforeEach, afterEach,
} from 'jasmine-fix';
import { join } from 'path';

// eslint-disable-next-line import/named
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
      expect(messages[0].severity).toBe('error');
      expect(messages[0].description).not.toBeDefined();
      expect(messages[0].url).not.toBeDefined();
      expect(messages[0].excerpt).toBe('Syntax error');
      expect(messages[0].location.file).toBe(parseFailPath);
      expect(messages[0].location.position).toEqual([[0, 0], [0, 19]]);
    });

    it('handles regular warnings', async () => {
      const editor = await atom.workspace.open(badPath);
      const messages = await lint(editor);

      expect(messages.length).toBe(2);

      expect(messages[0].severity).toBe('warning');
      expect(messages[0].description).not.toBeDefined();
      expect(messages[0].url).not.toBeDefined();
      expect(messages[0].excerpt).toBe('accessing global `my_nmuber`');
      expect(messages[0].location.file).toBe(badPath);
      expect(messages[0].location.position).toEqual([[5, 4], [5, 18]]);

      expect(messages[1].severity).toBe('warning');
      expect(messages[1].description).not.toBeDefined();
      expect(messages[1].url).not.toBeDefined();
      expect(messages[1].excerpt).toBe('assigned but unused `my_number`');
      expect(messages[1].location.file).toBe(badPath);
      expect(messages[1].location.position).toEqual([[0, 0], [0, 16]]);
    });
  });
});
