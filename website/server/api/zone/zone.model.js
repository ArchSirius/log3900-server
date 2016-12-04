'use strict';

import crypto from 'crypto';
mongoose.Promise = require('bluebird');
import mongoose, {Schema} from 'mongoose';

var ZoneSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  private: {
    type: Boolean, default: false
  },
  password: String,
  salt: String,
  thumbnail: String,
  stats: {
    playedGames: {
      type: Number,
      default: 0
    },
    playedTime: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Virtuals
 */

ZoneSchema.virtual('nodes', {
  ref: 'Node',
  localField: '_id',
  foreignField: 'zone'
});

/**
 * Validations
 */

// Validate no creator
ZoneSchema
  .path('createdBy')
  .validate(function(createdBy) {
    return createdBy.length;
  }, 'A creator is required');

var validatePresenceOf = function(value) {
  return value && value.length;
};

/**
 * Pre-save hook
 */
ZoneSchema
  .pre('save', function(next) {
    // Handle new/update passwords
    if (!this.isModified('password')) {
      if (!this._id) {
        this.createdAt = new Date();
      }
      this.updatedAt = new Date();
      return next();
    }

    if (!validatePresenceOf(this.password)) {
      return next(new Error('Invalid password'));
    }

    // Make salt with a callback
    this.makeSalt((saltErr, salt) => {
      if (saltErr) {
        return next(saltErr);
      }
      this.salt = salt;
      this.encryptPassword(this.password, (encryptErr, hashedPassword) => {
        if (encryptErr) {
          return next(encryptErr);
        }
        this.password = hashedPassword;
        if (!this._id) {
          this.createdAt = new Date();
        }
        this.updatedAt = new Date();
        next();
      });
    });
  });

/**
 * Methods
 */
ZoneSchema.methods = {
  /**
   * Authenticate - check if the passwords are the same
   *
   * @param {String} password
   * @param {Function} callback
   * @return {Boolean}
   * @api public
   */
  authenticate(password, callback) {
    if (!callback) {
      return this.password === this.encryptPassword(password);
    }

    this.encryptPassword(password, (err, pwdGen) => {
      if (err) {
        return callback(err);
      }

      if (this.password === pwdGen) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    });
  },

  /**
   * Make salt
   *
   * @param {Number} byteSize Optional salt byte size, default to 16
   * @param {Function} callback
   * @return {String}
   * @api public
   */
  makeSalt(byteSize, callback) {
    var defaultByteSize = 16;

    if (typeof arguments[0] === 'function') {
      callback = arguments[0];
      byteSize = defaultByteSize;
    } else if (typeof arguments[1] === 'function') {
      callback = arguments[1];
    }

    if (!byteSize) {
      byteSize = defaultByteSize;
    }

    if (!callback) {
      return crypto.randomBytes(byteSize).toString('base64');
    }

    return crypto.randomBytes(byteSize, (err, salt) => {
      if (err) {
        callback(err);
      } else {
        callback(null, salt.toString('base64'));
      }
    });
  },

  /**
   * Encrypt password
   *
   * @param {String} password
   * @param {Function} callback
   * @return {String}
   * @api public
   */
  encryptPassword(password, callback) {
    if (!password || !this.salt) {
      if (!callback) {
        return null;
      } else {
        return callback('Missing password or salt');
      }
    }

    var defaultIterations = 10000;
    var defaultKeyLength = 64;
    var salt = new Buffer(this.salt, 'base64');

    if (!callback) {
      return crypto.pbkdf2Sync(password, salt, defaultIterations, defaultKeyLength)
                   .toString('base64');
    }

    return crypto.pbkdf2(password, salt, defaultIterations, defaultKeyLength, (err, key) => {
      if (err) {
        callback(err);
      } else {
        callback(null, key.toString('base64'));
      }
    });
  }
};

export default mongoose.model('Zone', ZoneSchema);
