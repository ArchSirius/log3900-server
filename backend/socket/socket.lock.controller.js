const Node = require('../app/node/node.model');
const Zone = require('../app/zone/zone.model');
const _    = require('lodash');

/**
 * Contains the owner of each node lock of each zone.
 * @private
 */
var lock = {};

/**
 * Contains the assigned user of each start node of each zone.
 * @private
 */
var assignedStartNodes = {};

/**
 * Return the (un)locked status of a node.
 * @param {ObjectId|string} nodeId - The target node _id.
 * @returns {boolean} Locked status.
 */
exports.isNodeLocked = function(nodeId) {
	return lock[nodeId.toString()] ? true : false;
};

/**
 * Return the owner of a node.
 * @param {ObjectId|string} nodeId - The target node _id.
 * @returns {string} The userId who owns the node.
 */
exports.getNodeOwner = function(nodeId) {
	return lock[nodeId.toString()];
};

/**
 * Return the (un)owned status of a node lock.
 * @param {ObjectId|string} nodeId - The target node _id.
 * @param {ObjectId|string} userId - The userId to verify.
 * @returns {boolean} Owner status.
 */
exports.isNodeOwner = function(nodeId, userId) {
	return lock[nodeId.toString()] === userId.toString();
};

/**
 * Return the accessibility of a node. If a node has no lock or if the user owns the lock, the user has access to the node.
 * @param {ObjectId|string} nodeId - The target node_id.
 * @param {ObjectId|string} userId - The userId to verify.
 * @returns {boolean} Access status.
 */
exports.hasAccess = function(nodeId, userId) {
	return !this.isNodeLocked(nodeId) || this.isNodeOwner(nodeId, userId);
};

/**
 * Lock nodes and set a user as owner.
 * @param {Object[]} nodes - The target nodes.
 * @param {ObjectId|string} nodes[]._id - The unique _id of a node.
 * @param {ObjectId|string} userId - The userId to own the lock.
 * @returns {Object[]} The successfully locked nodes.
 */
exports.lockNodes = function(nodes, userId) {
	var newLock = [];
	nodes.forEach(node => {
		if (!this.isNodeLocked(node._id)) {
			lock[node._id.toString()] = userId.toString();
			newLock.push({ _id: node._id });
		}
	});
	return newLock;
};

/**
 * Unlock nodes if caller is owner.
 * @param {Object[]} nodes - The target nodes.
 * @param {ObjectId|string} nodes[]._id - The unique _id of a node.
 * @param {ObjectId|string} userId - The userId to own the lock.
 * @returns {Object[]} The successfully unlocked nodes.
 */
exports.unlockNodes = function(nodes, userId) {
	var newUnlock = [];
	nodes.forEach(node => {
		if (this.isNodeLocked(node._id) && this.isNodeOwner(node._id, userId)) {
			delete lock[node._id.toString()];
			newUnlock.push({ _id: node._id });
		}
	});
	return newUnlock;
};

/**
 * Return locked nodes of a zone.
 * @param {Object} zone - The target zone.
 * @returns {Object[]} The array of locked nodes.
 */
exports.getZoneLocks = function(zone) {
	if (!zone.nodes) {
		return [];
	}
	var lockedNodes = [];
	zone.nodes.forEach(node => {
		if (this.isNodeLocked(node._id)) {
			lockedNodes.push({
				nodeId: node._id,
				userId: this.getNodeOwner(node._id)
			});
		}
	});
	return lockedNodes;
};

/**
 * Return locked nodes of a zone async.
 * @param {string} zoneId - The unique _id of a zone.
 * @param {callback} [callback] - The callback that handles the response.
 * @returns {Object[]} The array of locked nodes.
 */
exports.getZoneLocksAsync = function(zoneId, callback) {
	return Zone.findById(zoneId).populate('nodes').exec()
	.then(zone => {
		const zoneLocks = this.getZoneLocks(zone);
		if (callback) {
			callback(zoneLocks);
		}
		return zoneLocks;
	});
};

/**
 * Assign a user to a starting point if one is available.
 * @param {Object} zone - The target zone containing the nodes.
 * @param {string} userId - The unique _id of a user.
 * @returns {string} The _id of the assigned node, if success.
 */
exports.tryAssignUserStartpoint = function(zone, userId) {
	if (this.getUserStartpoint(userId)) {
		return undefined;
		// TODO unassign then re-assign instead of rejecting
	}
	const nodes = getStartNodes(zone);
	for (var i = 0; i < nodes.length; ++i) {
		if (!this.getStartpointUser(nodes[i]._id)) {
			if (this.assignUserStartpoint(nodes[i], userId)) {
				return nodes[i]._id;
			}
		}
	}
	return undefined;
};

/**
 * Assign a user to a starting point if one is available.
 * @param {Object} node - The node to assign.
 * @param {string} userId - The unique _id of a user.
 * @returns {boolean} Success status.
 */
exports.assignUserStartpoint = function(node, userId) {
	if (node.type !== 'depart' || this.getStartpointUser(node._id) || this.getUserStartpoint(userId)) {
		return false;
		// TODO unassign then re-assign instead of rejecting
	}
	assignedStartNodes[node._id.toString()] = userId.toString();
	return true;
};

/**
 * Unassign a starting point.
 * @param {string} nodeId - The unique _id of a node.
 * @param {string} The user _id, if was assigned.
 */
exports.unassignStartpointUser = function(nodeId) {
	if (assignedStartNodes[nodeId.toString()]) {
		const userId = assignedStartNodes[nodeId.toString()];
		delete assignedStartNodes[nodeId.toString()];
		return userId;
	}
	return undefined;
};

/**
 * Unassign a user from his starting point.
 * @param {string} userId - The unique _id of a user.
 * @returns {string} The node _id, if was assigned.
 */
exports.unassignUserStartpoint = function(userId) {
	const nodeId = this.getUserStartpoint(userId);
	if (nodeId) {
		delete assignedStartNodes[nodeId];
	}
	return nodeId;
};

/**
 * Return the starting point (node _id) assigned to the user.
 * @param {string} userId - The unique _id of a user.
 * @returns {string} The node _id, if exists.
 */
exports.getUserStartpoint = function(userId) {
	for (node in assignedStartNodes) {
		if (assignedStartNodes[node] === userId.toString()) {
			return node;
		}
	}
	return undefined;
};

/**
 * Return the user assigned to the starting point (node _id).
 * @param {ObjectId|string} nodeId - The unique _id of a node.
 * @returns {string} The user _id, if assigned.
 */
exports.getStartpointUser = function(nodeId) {
	return assignedStartNodes[nodeId.toString()];
};

/**
 * Return the assigned starting points and users in a zone.
 * @param {Object} zone - The target zone.
 * @returns {Object[]} The array of corresponding node._id and user._id.
 */
exports.getAssignedStartpoints = function(zone) {
	if (!zone.nodes) {
		return [];
	}
	var res = [];
	zone.nodes.forEach(node => {
		if (node.type === 'depart') {
			const userId = this.getStartpointUser(node._id.toString());
			if (userId) {
				res.push({
					nodeId: node._id,
					userId: userId
				});
			}
		}
	});
	return res;
};

/**
 * Return the assigned starting points and users async.
 * @param {string} zoneId - The unique _id of a zone.
 * @param {callback} [callback] - The callback that handles the response.
 * @returns {Object[]} The array of corresponding node._id and user._id.
 */
exports.getZoneLocksAsync = function(zoneId, callback) {
	return Zone.findById(zoneId).populate('nodes').exec()
	.then(zone => {
		const res = this.getAssignedStartpoints(zone);
		if (callback) {
			callback(res);
		}
		return res;
	});
};

/**
 * Return the starting points contained in a zone.
 * @private
 * @param {Object} zone - The target zone containing the nodes.
 * @returns {Object[]} The nodes.
 */
const getStartNodes = function(zone) {
	var res = [];
	if (!zone.nodes) {
		return res;
	}
	zone.nodes.forEach(node => {
		if (node.type === 'depart') {
			res.push(node);
		}
	});
	return res;
};
