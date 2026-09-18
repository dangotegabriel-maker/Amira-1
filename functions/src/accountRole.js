'use strict';
// hostStatus.isApproved is protected by rules and set only by trusted approval.
// Application status and legacy role/verification strings never grant privileges.
const isApprovedHost = (user) => user?.hostStatus?.isApproved === true;
const accountRole = (user) => isApprovedHost(user) ? 'host' : 'consumer';
const isConsumer = (user) => Boolean(user) && !isApprovedHost(user);
module.exports = { isApprovedHost, accountRole, isConsumer };
