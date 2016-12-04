'use strict';

var mongoose     = require('mongoose');
mongoose.Promise = require('bluebird');
var Schema       = mongoose.Schema;

var NodeSchema = new Schema({
  zone: {
    type: Schema.ObjectId,
    ref: 'Zone',
    required: true
  },
  type: {
    type: String,
    enum: [
      'cylindre',
      'depart',
      'ligne',
      'mur',
      'robot',
      'segment',
      'table'
    ],
    required: true
  },
  position: {
    x: {
      type: Number,
      default: 0.0
    },
    y: {
      type: Number,
      default: 0.0
    },
    z: {
      type: Number,
      default: 0.0
    }
  },
  angle: {
    type: Number,
    default: 0.0
  },
  scale: {
    x: {
      type: Number,
      default: 1.0
    },
    y: {
      type: Number,
      default: 1.0
    },
    z: {
      type: Number,
      default: 1.0
    }
  },
  parent: {
    type: Schema.ObjectId,
    ref: 'Node',
    default: null
  },
  createdBy: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: Schema.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

/**
 * Pre-save hook
 */
NodeSchema
  .pre('save', function(next) {
    const time = new Date().getTime();
    if (!this._id) {
      this.createdAt = time;
    }
    this.updatedAt = time;
    return next();
  });

module.exports = mongoose.model('Node', NodeSchema);
