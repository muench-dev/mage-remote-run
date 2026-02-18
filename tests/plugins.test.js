import { jest } from '@jest/globals';

jest.unstable_mockModule('../lib/config.js', () => ({
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
}));

jest.unstable_mockModule('node:fs/promises', () => ({
  realpath: jest.fn(async (value) => value),
}));

const { registerPluginsCommands } = await import('../lib/commands/plugins.js');
const { loadConfig, saveConfig } = await import('../lib/config.js');
const { realpath } = await import('node:fs/promises');
const { Command } = await import('commander');

describe('Plugin Commands', () => {
  let program;
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    program = new Command();
    registerPluginsCommands(program);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('plugin register', () => {
    it('should register a new plugin', async () => {
      loadConfig.mockResolvedValue({ plugins: [] });
      
      await program.parseAsync(['node', 'test', 'plugin', 'register', 'my-plugin']);

      expect(loadConfig).toHaveBeenCalled();
      expect(saveConfig).toHaveBeenCalledWith({ plugins: ['my-plugin'] });
      expect(realpath).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('successfully registered'));
    });

    it('should resolve filesystem path with realpath', async () => {
      loadConfig.mockResolvedValue({ plugins: [] });
      realpath.mockResolvedValue('/resolved/plugins/my-plugin');

      await program.parseAsync(['node', 'test', 'plugin', 'register', './plugins/my-plugin']);

      expect(realpath).toHaveBeenCalledWith('./plugins/my-plugin');
      expect(saveConfig).toHaveBeenCalledWith({ plugins: ['/resolved/plugins/my-plugin'] });
    });

    it('should resolve relative path without dot prefix', async () => {
      loadConfig.mockResolvedValue({ plugins: [] });
      realpath.mockResolvedValue('/resolved/plugins/my-plugin');

      await program.parseAsync(['node', 'test', 'plugin', 'register', 'plugins/my-plugin']);

      expect(realpath).toHaveBeenCalledWith('plugins/my-plugin');
      expect(saveConfig).toHaveBeenCalledWith({ plugins: ['/resolved/plugins/my-plugin'] });
    });

    it('should not resolve scoped npm package names', async () => {
      loadConfig.mockResolvedValue({ plugins: [] });

      await program.parseAsync(['node', 'test', 'plugin', 'register', '@scope/my-plugin']);

      expect(realpath).not.toHaveBeenCalled();
      expect(saveConfig).toHaveBeenCalledWith({ plugins: ['@scope/my-plugin'] });
    });

    it('should not register if already exists', async () => {
      loadConfig.mockResolvedValue({ plugins: ['existing-plugin'] });
      
      await program.parseAsync(['node', 'test', 'plugin', 'register', 'existing-plugin']);

      expect(loadConfig).toHaveBeenCalled();
      expect(saveConfig).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('already registered'));
    });

    it('should handle config without plugins array', async () => {
      loadConfig.mockResolvedValue({});
      
      await program.parseAsync(['node', 'test', 'plugin', 'register', 'new-plugin']);

      expect(saveConfig).toHaveBeenCalledWith({ plugins: ['new-plugin'] });
    });
  });

  describe('plugin unregister', () => {
    it('should unregister an existing plugin', async () => {
      loadConfig.mockResolvedValue({ plugins: ['plugin-a', 'plugin-b'] });

      await program.parseAsync(['node', 'test', 'plugin', 'unregister', 'plugin-a']);

      expect(realpath).not.toHaveBeenCalled();
      expect(saveConfig).toHaveBeenCalledWith({ plugins: ['plugin-b'] });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('successfully unregistered'));
    });

    it('should unregister a filesystem path plugin using realpath', async () => {
      loadConfig.mockResolvedValue({ plugins: ['/resolved/plugins/plugin-a', 'plugin-b'] });
      realpath.mockResolvedValue('/resolved/plugins/plugin-a');

      await program.parseAsync(['node', 'test', 'plugin', 'unregister', './plugins/plugin-a']);

      expect(realpath).toHaveBeenCalledWith('./plugins/plugin-a');
      expect(saveConfig).toHaveBeenCalledWith({ plugins: ['plugin-b'] });
    });

    it('should warn if plugin not found', async () => {
      loadConfig.mockResolvedValue({ plugins: ['plugin-a'] });

      await program.parseAsync(['node', 'test', 'plugin', 'unregister', 'plugin-c']);

      expect(saveConfig).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('not registered'));
    });
  });

  describe('plugin list', () => {
    it('should list registered plugins', async () => {
        loadConfig.mockResolvedValue({ plugins: ['plugin-1', 'plugin-2'] });

        await program.parseAsync(['node', 'test', 'plugin', 'list']);

        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('plugin-1'));
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('plugin-2'));
    });

    it('should show message if no plugins', async () => {
        loadConfig.mockResolvedValue({ plugins: [] });

        await program.parseAsync(['node', 'test', 'plugin', 'list']);

        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No plugins registered'));
    });
  });
});
