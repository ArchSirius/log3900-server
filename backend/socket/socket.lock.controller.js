const _ = require('lodash');

/**
 * Contains the owner of each node lock of each zone.
 * @private
 */
var lockedNodes = {};

/**
 * Contains the assigned user of each start node of each zone.
 * @private
 */
var assignedStartNodes = {};

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

/**
 * Assign a user to a starting point if one is available.
 * @param {Object} zone - The target zone containing the nodes.
 * @param {string} userId - The unique _id of a user.
 * @returns {string} The _id of the assigned node, if success.
 */
exports.tryAssignUserStartpoint = function(zone, userId) {
	if (this.getUserStartpoint(zone._id, userId)) {
		return undefined;
	}
	const nodes = getStartNodes(zone);
	for (var i = 0; i < nodes.length; ++i) {
		if (!this.getStartpointUser(zone._id, nodes[i]._id)) {
			if (this.assignUserStartpoint(zone._id, nodes[i], userId)) {
				return nodes[i]._id;
			}
		}
	}
	return undefined;
};

/**
 * Assign a user to a starting point if one is available.
 * @param {Object} zoneId - The target zone _id containing the nodes.
 * @param {Object} node - The node to assign.
 * @param {string} userId - The unique _id of a user.
 * @returns {boolean} Success status.
 */
exports.assignUserStartpoint = function(zoneId, node, userId) {
	if (!assignedStartNodes[zoneId]) {
		assignedStartNodes[zoneId] = {};
	}
	if (node.type !== 'depart' || this.getStartpointUser(zoneId, node._id) || this.getUserStartpoint(zoneId, userId)) {
		return false;
	}
	assignedStartNodes[zoneId][String(node._id)] = String(userId);
	return true;
};

/**
 * Unassign a user from his starting point.
 * @param {Object} zoneId - The target zone _id containing the nodes.
 * @param {string} userId - The unique _id of a user.
 * @param {string} The node _id, if was assigned.
 */
exports.unassignUserStartpoint = function(zoneId, userId) {
	if (assignedStartNodes[zoneId]) {
		const nodeId = this.getUserStartpoint(zoneId, userId);
		if (nodeId && assignedStartNodes[zoneId][nodeId]) {
			delete assignedStartNodes[zoneId][nodeId];
			return nodeId;
		}
	}
	return undefined;
};

/**
 * Return the starting point (node _id) assigned to the user.
 * @param {Object} zoneId - The target zone _id containing the nodes.
 * @param {string} userId - The unique _id of a user.
 * @returns {string} The node _id, if exists.
 */
exports.getUserStartpoint = function(zoneId, userId) {
	const data = assignedStartNodes[zoneId];
	if (!data) {
		return undefined;
	}
	for (node in data) {
		if (data[node] === String(userId)) {
			return node;
		}
	}
	return undefined;
};

/**
 * Return the user assigned to the starting point (node _id).
 * @param {Object} zoneId - The target zone _id containing the nodes.
 * @param {string} nodeId - The unique _id of a node.
 * @returns {string} The user _id, if assigned.
 */
exports.getStartpointUser = function(zoneId, nodeId) {
	const data = assignedStartNodes[zoneId];
	if (!data) {
		return undefined;
	}
	return data[String(nodeId)];
};

/**
 * Return the assigned starting points and users in a zone.
 * @param {Object} zoneId - The target zone _id containing the nodes.
 * @returns {Object[]} The array of corresponding node._id and user._id.
 */
exports.getAssignedStartpoints = function(zoneId) {
	var res = [];
	const data = assignedStartNodes[zoneId];
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

/**
 * Return the starting points contained in a zone.
 * @private
 * @param {Object} zone - The target zone containing the nodes.
 * @returns {Object[]} The nodes.
 */
const getStartNodes = function(zone) {
	var res = [];
	zone.nodes.forEach(node => {
		if (node.type === 'depart') {
			res.push(node);
		}
	});
	return res;
};
