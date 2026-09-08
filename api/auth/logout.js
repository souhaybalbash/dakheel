const { send, method } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  // JWT is client-held; logout is a no-op server-side.
  return send(res, 200, { ok: true });
};
