const crypto = require('crypto');

const urlSafeToken = crypto.randomBytes(32).toString('base64url')
console.log(urlSafeToken);


