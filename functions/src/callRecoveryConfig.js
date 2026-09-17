'use strict';
// Shared by the native client and trusted backend. These are recovery timings,
// not business pricing. A missed lease stops accounting before reconciliation.
module.exports = Object.freeze({ RECONNECT_GRACE_SECONDS: 10,
  HEARTBEAT_INTERVAL_MS: 3000, CONNECTION_LEASE_MS: 12000,
  CONNECTING_TIMEOUT_MS: 45000 });
