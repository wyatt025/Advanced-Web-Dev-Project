async function transaction(pool, rollbackLabel, work) {
    const connection = await pool.getConnection();
    let started = false;
    try {
        await connection.beginTransaction();
        started = true;
        const result = await work(connection);
        await connection.commit();
        started = false;
        return result;
    } catch (error) {
        if (started) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(`${rollbackLabel} rollback failed:`, rollbackError.code || 'UNKNOWN_ERROR');
            }
        }
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { transaction };
