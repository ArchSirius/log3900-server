'use strict';

var mongoose     = require('mongoose');
mongoose.Promise = require('bluebird');
var Schema       = mongoose.Schema;

var MessageSchema = new Schema({
  channel: {
    type: Schema.ObjectId,
    ref: 'Channel',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  createdBy: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', MessageSchema);
