import { createCommandMatcher, DEFAULT_MCP_COMMAND_GROUPS, resolveCommandPatterns } from '../lib/mcp.js';

describe('MCP command filtering', () => {
    test('expands recursive groups and wildcard patterns', () => {
        const patterns = resolveCommandPatterns('@catalog order:*');

        expect(patterns).toContain('order:*');
        expect(patterns).toContain('product:*');
        expect(patterns).toContain('inventory:*');
        expect(patterns).toContain('tax:*');
        expect(patterns).toContain('eav:*');
    });

    test('exclude patterns take priority over include', () => {
        const matcher = createCommandMatcher({
            include: '@safe @connection order:*',
            exclude: 'order:cancel'
        });

        expect(matcher('order:list')).toBe(true);
        expect(matcher('order:cancel')).toBe(false);
        expect(matcher('connection:add')).toBe(true);
    });

    test('safe is default include group', () => {
        const matcher = createCommandMatcher({});

        expect(matcher('website:list')).toBe(true);
        expect(matcher('connection:add')).toBe(false);
    });

    test('risky group allows everything', () => {
        const matcher = createCommandMatcher({ include: '@risky' });

        expect(matcher('connection:add')).toBe(true);
        expect(matcher('import:json')).toBe(true);
    });

    test('throws on unknown groups', () => {
        expect(() => resolveCommandPatterns('@does-not-exist', DEFAULT_MCP_COMMAND_GROUPS)).toThrow(
            'Unknown MCP command group "@does-not-exist"'
        );
    });
});
