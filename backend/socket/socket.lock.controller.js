const _ = require('lodash');

/**
 * Contains the owner of each node lock of each zone.
 * @private
 */
var lockedNodes = {};

/**
 * Return the (un)locked status of a node.
 * @param {Object} zone - The target zone containing the nodes.
 * @param {Object} node - The target node.
 * @returns {boolean} Locked status.
 */
exports.isNodeLocked = function(zone, node) {
	return !_.isEmpty(lockedNodes[zone._id]) &&
	lockedNodes[zone._id][String(node._id)];
};

/**
 * Return the (un)owned status of a node lock.
 * @param {Object} zone - The target zone containing the nodes.
 * @param {Object} node - The target node.
 * @param {string} userId - The userId to verify.
 * @returns {boolean} Owner status.
 */
exports.isNodeOwner = function(zone, node, userId) {
	return !_.isEmpty(lockedNodes[zone._id]) &&
	String(lockedNodes[zone._id][String(node._id)]) === String(userId);
};

/**
 * Return the accessibility of a node. If a node has no lock or if the user owns the lock, the user has access to the node.
 * @param {Object} zone - The target zone containing the nodes.
 * @param {Object} node - The target node.
 * @param {string} userId - The userId to verify.
 * @returns {boolean} Access status.
 */
exports.hasAccess = function(zone, node, userId) {
	return !this.isNodeLocked(zone, node) ||
	this.isNodeOwner(zone, node, userId);
};

/**
 * Lock nodes and set a user as owner.
 * @param {Object} zone - The target zone containing the nodes.
 * @param {Object[]} nodes - The target nodes.
 * @param {string} nodes[]._id - The unique _id of a node.
 * @param {string} userId - The userId to own the lock.
 * @returns {Object[]} The successfully locked nodes.
 */
exports.lockNodes = function(zone, nodes, userId) {
	if (!lockedNodes[zone._id]) {
		lockedNodes[zone._id] = {};
	}
	var newLock = [];
	nodes.forEach(node => {
		if (!this.isNodeLocked(zone, node)) {
			lockedNodes[zone._id][String(node._id)] = String(userId);
			newLock.push({ _id: node._id });
		}
	});
	return newLock;
};

/**
 * Unlock nodes if caller is owner.
 * @param {Object} zone - The target zone containing the nodes.
 * @param {Object[]} nodes - The target nodes.
 * @param {string} nodes[]._id - The unique _id of a node.
 * @param {string} userId - The userId to own the lock.
 * @returns {Object[]} The successfully unlocked nodes.
 */
exports.unlockNodes = function(zone, nodes, userId) {
	if (!lockedNodes[zone._id]) {
		return [];
	}
	var newUnlock = [];
	nodes.forEach(node => {
		if (this.isNodeLocked(zone, node) && this.isNodeOwner(zone, node, userId)) {
			delete lockedNodes[zone._id][String(node._id)];
			newUnlock.push({ _id: node._id });
		}
	});
	if (_.isEmpty(lockedNodes[zone._id])) {
		delete lockedNodes[zone._id];
	}
	return newUnlock;
};

/**
 * Return locked nodes of a zone.
 * @param {string} zoneId - The unique _id of a zone.
 * @returns {Object[]} The array of locked nodes.
 */
exports.getZoneLocks = function(zoneId) {
	var res = [];
	const data = lockedNodes[zoneId];
	if (!data) {
		return [];
	}
	for (node in data) {
		res.push({
			nodeId: node,
			userId: data[node]
		});
	}
	return res;
};
