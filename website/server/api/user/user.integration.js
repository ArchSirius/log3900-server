'use strict';

import app from '../..';
import User from './user.model';
import request from 'supertest';

describe('User API:', function() {
  var user;
  var token;

  // Clear users before testing
  before(function() {
    return User.remove().then(function() {
      user = new User({
        name: 'Fake User',
        username: 'test',
        email: 'test@example.com',
        password: 'password'
      });

      return user.save();
    });
  });

  // Clear users after testing
  after(function() {
    return User.remove();
  });

  describe('GET /api/users/me', function() {
    before(function(done) {
      request(app)
        .post('/auth/local')
        .send({
          username: 'test',
          password: 'password'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          token = res.body.token;
          done();
        });
    });

    it('should respond with a user profile when authenticated', function(done) {
      request(app)
        .get('/api/users/me')
        .set('authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.body._id.toString().should.equal(user._id.toString());
          done();
        });
    });

    it('should respond with a 401 when not authenticated', function(done) {
      request(app)
        .get('/api/users/me')
        .expect(401)
        .end(done);
    });
  });

  describe('GET /api/users', function() {
    var users;

    beforeEach(function(done) {
      request(app)
        .get('/api/users')
        .set('authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if(err) {
            return done(err);
          }
          users = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      users.should.be.instanceOf(Array);
    });
  });
});
