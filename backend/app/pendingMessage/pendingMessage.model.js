'use strict';

var mongoose     = require('mongoose');
mongoose.Promise = require('bluebird');
var Schema       = mongoose.Schema;

var PendingMessageSchema = new Schema({
  user: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: Schema.ObjectId,
    ref: 'Message',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PendingMessage', PendingMessageSchema);
