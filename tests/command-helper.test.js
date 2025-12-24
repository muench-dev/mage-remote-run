
import { jest } from '@jest/globals';
import { expandCommandAbbreviations } from '../lib/command-helper.js';

describe('command-helper', () => {
    let mockRootCommand;
    let childCommand;
    let grandchildCommand;

    beforeEach(() => {
        // Setup a mock command structure
        // root -> child (name: 'child', alias: 'c') -> grandchild (name: 'grandchild', alias: 'gc')

        grandchildCommand = {
            name: () => 'grandchild',
            aliases: () => ['gc'],
            commands: []
        };

        childCommand = {
            name: () => 'child',
            aliases: () => ['c'],
            commands: [grandchildCommand]
        };

        mockRootCommand = {
            name: () => 'root',
            commands: [childCommand]
        };
    });

    describe('expandCommandAbbreviations', () => {
        it('should return args as is if no commands match', () => {
            const result = expandCommandAbbreviations(mockRootCommand, ['unknown']);
            expect(result).toEqual(['unknown']);
        });

        it('should expand full command name', () => {
            const result = expandCommandAbbreviations(mockRootCommand, ['child']);
            expect(result).toEqual(['child']);
        });

        it('should expand abbreviated command name', () => {
            const result = expandCommandAbbreviations(mockRootCommand, ['chi']);
            expect(result).toEqual(['child']);
        });

        it('should expand alias', () => {
            const result = expandCommandAbbreviations(mockRootCommand, ['c']);
            expect(result).toEqual(['child']);
        });

        it('should expand nested commands', () => {
            const result = expandCommandAbbreviations(mockRootCommand, ['child', 'grandchild']);
            expect(result).toEqual(['child', 'grandchild']);
        });

        it('should expand nested abbreviations', () => {
            const result = expandCommandAbbreviations(mockRootCommand, ['c', 'gc']);
            expect(result).toEqual(['child', 'grandchild']);
        });

        it('should handle arguments that are flags', () => {
            const result = expandCommandAbbreviations(mockRootCommand, ['child', '--flag']);
            expect(result).toEqual(['child', '--flag']);
        });

        it('should handle arguments after commands', () => {
            const result = expandCommandAbbreviations(mockRootCommand, ['child', 'arg1']);
            expect(result).toEqual(['child', 'arg1']);
        });

        // NEW TESTS
        it('should expand colon-separated commands: child:grandchild', () => {
            const result = expandCommandAbbreviations(mockRootCommand, ['child:grandchild']);
            expect(result).toEqual(['child', 'grandchild']);
        });

        it('should expand colon-separated abbreviations: c:gc', () => {
            const result = expandCommandAbbreviations(mockRootCommand, ['c:gc']);
            expect(result).toEqual(['child', 'grandchild']);
        });

        it('should expand mixed colon and space: c:gc arg', () => {
            const result = expandCommandAbbreviations(mockRootCommand, ['c:gc', 'arg']);
            expect(result).toEqual(['child', 'grandchild', 'arg']);
        });

        it('should expand colon separated with partial abbreviations: chi:gran', () => {
            const result = expandCommandAbbreviations(mockRootCommand, ['chi:gran']);
            expect(result).toEqual(['child', 'grandchild']);
        });

        it('should throw ambiguous error if multiple matches', () => {
            // Add another command to make 'c' ambiguous if we had another 'c' something
            // But let's add a sibling to child
            const siblingCommand = {
                name: () => 'chipmunk', // starts with 'chi' too
                aliases: () => [],
                commands: []
            };
            mockRootCommand.commands.push(siblingCommand);

            expect(() => {
                expandCommandAbbreviations(mockRootCommand, ['chi']);
            }).toThrow(/Ambiguous command/);
        });
    });
});
