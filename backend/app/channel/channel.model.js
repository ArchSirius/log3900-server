'use strict';

var mongoose     = require('mongoose');
mongoose.Promise = require('bluebird');
var Schema       = mongoose.Schema;

var ChannelSchema = new Schema({
  name: {
    type: String,
    unique: true
  },
  private: {
    type: Boolean,
    default: false
  },
  users: {
    type: [{
      type: Schema.ObjectId,
      ref: 'User' 
    }],
    default: []
  }
});

module.exports = mongoose.model('Channel', ChannelSchema);
