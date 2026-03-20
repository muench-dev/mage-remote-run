import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { AppEventBus, eventBus, events } from '../lib/events.js';

describe('AppEventBus and eventBus', () => {
    test('AppEventBus should extend EventEmitter', () => {
        const bus = new AppEventBus();
        expect(bus).toBeInstanceOf(EventEmitter);
    });

    test('eventBus should be an instance of AppEventBus', () => {
        expect(eventBus).toBeInstanceOf(AppEventBus);
    });

    test('eventBus should emit and receive events', (done) => {
        const testData = { key: 'value' };
        eventBus.once('testEvent', (data) => {
            expect(data).toEqual(testData);
            done();
        });
        eventBus.emit('testEvent', testData);
    });

    test('events object should contain required event constants', () => {
        expect(events).toMatchObject({
            INIT: 'init',
            BEFORE_COMMAND: 'beforeCommand',
            AFTER_COMMAND: 'afterCommand',
            MCP_START: 'mcpStart'
        });
    });

    test('error event without listener should throw', () => {
        // EventEmitter throws when 'error' is emitted and there are no listeners
        const bus = new AppEventBus();
        expect(() => {
            bus.emit('error', new Error('Test Error'));
        }).toThrow('Test Error');
    });

    test('error event with listener should not throw', () => {
        const bus = new AppEventBus();
        const errorHandler = jest.fn();
        bus.on('error', errorHandler);

        expect(() => {
            bus.emit('error', new Error('Test Error'));
        }).not.toThrow();

        expect(errorHandler).toHaveBeenCalled();
    });
});
