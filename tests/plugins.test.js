import { jest } from '@jest/globals';

jest.unstable_mockModule('../lib/config.js', () => ({
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
}));

const { registerPluginsCommands } = await import('../lib/commands/plugins.js');
const { loadConfig, saveConfig } = await import('../lib/config.js');
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
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('successfully registered'));
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

      expect(saveConfig).toHaveBeenCalledWith({ plugins: ['plugin-b'] });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('successfully unregistered'));
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
