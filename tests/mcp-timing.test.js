import crypto from 'crypto';

describe('MCP Authentication Vulnerability', () => {
    test('timingSafeEqual works properly with multibyte character attacks', () => {
        const token = "regular_token_123";
        // '£' has length 1 in javascript string, but 2 bytes in utf-8
        // "regular_token_12£" has length 17, same as token
        const queryToken = "regular_token_12£";

        expect(queryToken.length).toBe(token.length);

        let authenticated = false;
        try {
            const tBuffer = Buffer.from(token);
            if (queryToken) {
                const qBuffer = Buffer.from(queryToken);
                if (qBuffer.length === tBuffer.length && crypto.timingSafeEqual(qBuffer, tBuffer)) {
                    authenticated = true;
                }
            }
        } catch(e) {
            // this should not be reached!
            expect(false).toBe(true);
        }

        expect(authenticated).toBe(false);
    });
});
