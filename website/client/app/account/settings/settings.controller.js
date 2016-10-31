'use strict';

export default class SettingsController {
  user = {
    _id: '',
    username: '',
    name: '',
    email: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  errors = {
    userInfos: {},
    password: {
      other: undefined
    }
  };
  message = {
    userInfos: '',
    password: ''
  };
  submitted = {
    userInfos: false,
    password: false
  };


  /*@ngInject*/
  constructor(Auth, apiCall) {
    this.Auth = Auth;
    this.apiCall = apiCall;
  }

  $onInit() {
    this.Auth.getCurrentUser().then(user => {
      this.user._id = user._id;
      this.user.username = user.username;
      this.user.name = user.name;
      this.user.email = user.email;
    });
  }

  changeUserInfos(form) {
    this.submitted.userInfos = true;

    if(form.$valid) {
      this.apiCall.updateUser({
        _id: this.user._id,
        username: this.user.username,
        name: this.user.name,
        email: this.user.email
      })
        .then(() => {
          this.message.userInfos = 'Informations modifiées avec succès.';
        })
        .catch(err => {
          err = err.data;
          this.errors.userInfos = {};
          // Update validity of form fields that match the mongoose errors
          angular.forEach(err.errors, (error, field) => {
            form[field].$setValidity('mongoose', false);
            this.errors.userInfos[field] = error.message;
          });
        });
    }
  }

  changePassword(form) {
    this.submitted.password = true;

    if(form.$valid) {
      this.Auth.changePassword(this.user.oldPassword, this.user.newPassword)
        .then(() => {
          this.message.password = 'Mot de passe modifié avec succès.';
        })
        .catch(() => {
          form.password.$setValidity('mongoose', false);
          this.errors.password.other = 'Mot de passe incorrect';
          this.message.password = '';
        });
    }
  }
}
