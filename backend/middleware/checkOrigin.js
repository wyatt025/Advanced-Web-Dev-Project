function checkOrigin(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    
    const allowedOrigin = process.env.FRONTEND_ORIGIN;

    if (!allowedOrigin) {
        console.error('FRONTEND_ORIGIN is not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    if (req.get('origin') !== allowedOrigin) {
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    return next();
}

module.exports = { checkOrigin };