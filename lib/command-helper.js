
export function resolveCommandMatch(parent, token) {
    const tokenLower = token.toLowerCase();

    // Check for exact match first
    const exactMatch = parent.commands.find((cmd) => {
        return cmd.name().toLowerCase() === tokenLower;
    });

    if (exactMatch) {
        return {
            match: exactMatch,
            matches: [exactMatch]
        };
    }

    const matches = parent.commands.filter((cmd) => {
        const name = cmd.name().toLowerCase();
        if (name.startsWith(tokenLower)) return true;
        const aliases = cmd.aliases ? cmd.aliases() : [];
        return aliases.some((alias) => alias.toLowerCase().startsWith(tokenLower));
    });

    return {
        match: matches.length === 1 ? matches[0] : null,
        matches
    };
}

export function expandCommandAbbreviations(rootCommand, argv) {
    const expanded = [];
    let current = rootCommand;
    const path = [];

    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token.startsWith('-')) {
            expanded.push(token);
            continue;
        }

        if (!current.commands || current.commands.length === 0) {
            expanded.push(...argv.slice(i));
            break;
        }

        // Feature: Support colon separators
        // If the token contains colons, try to split it and resolve parts
        if (token.includes(':')) {
            const parts = token.split(':');
            const originalArgv = argv.slice(0); // copy

            // Modify argv effectively for this lookahead
            const remainingArgv = [...parts, ...argv.slice(i + 1)];

            // Recursively expand the new sequence from current point
            // We need to resolve from 'current' but since expandCommandAbbreviations takes rootCommand, 
            // we should probably just verify if these parts are valid commands.
            // But expandCommandAbbreviations is designed to walk from root.
            // However, we are currently at 'current'.

            // To properly handle "cust:list" where "cust" is from root, we can just replace the token in the list
            // and continue loop, IF the first part matches something.

            // Let's check if the first part matches a command in current scope
            const firstPart = parts[0];
            const result = resolveCommandMatch(current, firstPart);

            if (result.match) {
                // If the first part matches, we replace the current token with the split parts
                // and effectively 'restart' processing or just insert them into argv and decrement i to re-process first part
                argv.splice(i, 1, ...parts);
                i--; // Stay on same index to process the first part of the split
                continue;
            }
        }

        const { match, matches } = resolveCommandMatch(current, token);
        if (!match) {
            if (matches.length > 1) {
                const parentName = path.length > 0 ? path.join(' ') : (current.name() !== 'mage-remote-run' ? current.name() : 'root');
                const options = matches.map((cmd) => cmd.name()).join(', ');
                let errorMessage = `Ambiguous command "${token}" under "${parentName}". Options: ${options}.`;
                // If this is a script, we might not want to console.error directly if we want to test it easily,
                // but complying with original code which did process.exit
                const error = new Error(errorMessage);
                error.isAmbiguous = true;
                throw error;
            }
            expanded.push(token);
            continue;
        }

        expanded.push(match.name());
        current = match;
        path.push(match.name());
    }

    return expanded;
}
