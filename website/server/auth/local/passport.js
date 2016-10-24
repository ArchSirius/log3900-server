import passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';

function localAuthenticate(User, username, password, done) {
  User.findOne({
    username: username
  }).exec()
    .then(user => {
      if(!user) {
        return done(null, false, {
          message: 'Ce nom d\'utilisateur n\'est pas enregistré.'
        });
      }
      user.authenticate(password, function(authError, authenticated) {
        if(authError) {
          return done(authError);
        }
        if(!authenticated) {
          return done(null, false, { message: 'Mot de passe incorrect.' });
        } else {
          return done(null, user);
        }
      });
    })
    .catch(err => done(err));
}

export function setup(User/*, config*/) {
  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password' // this is the virtual field on the model
  }, function(username, password, done) {
    return localAuthenticate(User, username, password, done);
  }));
}
