import { jest } from '@jest/globals';

// Mock chalk
const chalkProxy = new Proxy(function (str) { return str; }, {
    get: (target, prop) => {
        if (prop === 'default') return chalkProxy;
        return chalkProxy;
    },
    apply: (target, thisArg, args) => args[0]
});

jest.unstable_mockModule('chalk', () => ({
    default: chalkProxy
}));

const { handleError } = await import('../lib/utils.js');

describe('handleError', () => {
    let consoleErrorSpy;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should log regular error messages as is', () => {
        const error = new Error('Regular error');
        handleError(error);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Regular error');
    });

    it('should format Magento API JSON errors', () => {
        const jsonError = JSON.stringify({
            message: "No such entity with %fieldName = %fieldValue",
            parameters: {
                fieldName: "salesRepresentativeId",
                fieldValue: 1000
            }
        });
        const error = new Error(`API Error 404: ${jsonError}`);

        handleError(error);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'No such entity with salesRepresentativeId = 1000');
    });

    it('should fall back to original message if JSON parsing fails', () => {
        const error = new Error('API Error 500: Invalid JSON');
        handleError(error);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'API Error 500: Invalid JSON');
    });
});
