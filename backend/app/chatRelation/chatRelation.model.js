'use strict';

var mongoose     = require('mongoose');
mongoose.Promise = require('bluebird');
var Schema       = mongoose.Schema;

var ChatRelationSchema = new Schema({
  channel: {
    type: Schema.ObjectId,
    ref: 'Channel',
    required: true
  },
  userA: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true
  },
  userB: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true
  }
});

ChatRelationSchema.index({ userA: 1, userB: 1 }, { unique: true });

ChatRelationSchema.statics.get = function(userA, userB, callback) {
  return this.findOne(
  {
    $or: [
      { userA: userA, userB: userB },
      { userA: userB, userB: userA }
    ]
  },
  { channel: 1, _id: 0 },
  callback);
};

module.exports = mongoose.model('ChatRelation', ChatRelationSchema);
