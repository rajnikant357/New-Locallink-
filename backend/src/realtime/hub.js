const clientsByUser = new Map();

function addClient(userId, res) {
  if (!clientsByUser.has(userId)) {
    clientsByUser.set(userId, new Set());
  }
  clientsByUser.get(userId).add(res);
}

function removeClient(userId, res) {
  const bucket = clientsByUser.get(userId);
  if (!bucket) return;
  bucket.delete(res);
  if (bucket.size === 0) {
    clientsByUser.delete(userId);
  }
}

function writeEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function publishToUser(userId, event, payload) {
  const bucket = clientsByUser.get(userId);
  if (!bucket || bucket.size === 0) return;

  for (const res of bucket) {
    try {
      writeEvent(res, event, payload);
    } catch {
      // Ignore disconnected stream write failures.
    }
  }
}

module.exports = {
  addClient,
  removeClient,
  writeEvent,
  publishToUser,
};
