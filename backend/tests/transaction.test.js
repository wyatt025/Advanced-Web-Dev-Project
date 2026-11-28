const { test } = require('node:test');
const assert = require('node:assert/strict');
const { transaction } = require('../helpers/database/transaction');

function setup(failures = {}) {
    const calls = [];
    const connection = {
        async beginTransaction() { calls.push('begin'); if (failures.begin) throw failures.begin; },
        async commit() { calls.push('commit'); if (failures.commit) throw failures.commit; },
        async rollback() { calls.push('rollback'); if (failures.rollback) throw failures.rollback; },
        release() { calls.push('release'); },
    };
    const pool = {
        async getConnection() {
            calls.push('getConnection');
            if (failures.getConnection) throw failures.getConnection;
            return connection;
        },
    };
    return { pool, connection, calls };
}

test('commits and releases the supplied pool connection, returning the work result', async () => {
    const { pool, connection, calls } = setup();
    const result = await transaction(pool, 'Reservation', async (received) => {
        assert.equal(received, connection);
        calls.push('work');
        return false;
    });
    assert.equal(result, false);
    assert.deepEqual(calls, ['getConnection', 'begin', 'work', 'commit', 'release']);
});

test('rolls back and releases when work or commit fails', async () => {
    for (const stage of ['work', 'commit']) {
        const failure = new Error(`${stage} failed`);
        const { pool, calls } = setup(stage === 'commit' ? { commit: failure } : {});
        await assert.rejects(transaction(pool, 'Location', async () => {
            calls.push('work');
            if (stage === 'work') throw failure;
        }), (error) => error === failure);
        assert.deepEqual(calls, stage === 'work'
            ? ['getConnection', 'begin', 'work', 'rollback', 'release']
            : ['getConnection', 'begin', 'work', 'commit', 'rollback', 'release']);
    }
});

test('releases without rollback if beginning the transaction fails', async () => {
    const failure = new Error('begin failed');
    const { pool, calls } = setup({ begin: failure });
    await assert.rejects(transaction(pool, 'Screening', async () => calls.push('work')), (error) => error === failure);
    assert.deepEqual(calls, ['getConnection', 'begin', 'release']);
});

test('propagates connection acquisition failures', async () => {
    const failure = new Error('connection failed');
    const { pool, calls } = setup({ getConnection: failure });
    await assert.rejects(transaction(pool, 'Reservation', async () => calls.push('work')), (error) => error === failure);
    assert.deepEqual(calls, ['getConnection']);
});

test('logs rollback failure and rethrows the original error', async (t) => {
    const failure = new Error('work failed');
    const rollbackFailure = Object.assign(new Error('rollback failed'), { code: 'ROLLBACK_ERROR' });
    const { pool, calls } = setup({ rollback: rollbackFailure });
    const logger = t.mock.method(console, 'error', () => {});
    await assert.rejects(transaction(pool, 'Reservation', async () => {
        calls.push('work');
        throw failure;
    }), (error) => error === failure);
    assert.deepEqual(calls, ['getConnection', 'begin', 'work', 'rollback', 'release']);
    assert.equal(logger.mock.callCount(), 1);
    assert.deepEqual(logger.mock.calls[0].arguments, ['Reservation rollback failed:', 'ROLLBACK_ERROR']);
});
