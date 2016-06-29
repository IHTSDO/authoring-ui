'use strict';

////////////////////////////////////////////////////////////////////////////////
// Notification Service
//
// Polls for and broadcasts server-side event notifications
//
// Current endpoints with notification polling are:
// - scaService (ihtsdo-sca)
//
///////////////////////////////////////////////////////////////////////////////

angular.module('singleConceptAuthoringApp')
  .service('notificationService', ['$rootScope', function ($rootScope) {

    // force a notification to be sent from elsewhere in the app
    // simple broadcast, but ensures event text is uniform
    function sendMessage(message, durationInMs, url) {

      if (!message || message.length === 0) {
        console.error('Cannot send empty application notification');
      }

      console.log('Notification: ', message);

      var notification = {
        type: 'MESSAGE',
        message: message,
        url: url,
        durationInMs: durationInMs
      };
      $rootScope.$broadcast('notification', notification);
    }

    function sendWarning(message, durationInMs, url) {

      if (!message || message.length === 0) {
        console.error('Cannot send empty application notification');
      }

      console.warning('Notification: ', message);

      var notification = {
        type: 'WARNING',
        message: message,
        url: url,
        durationInMs: durationInMs
      };
      $rootScope.$broadcast('notification', notification);
    }

    function sendError(message, durationInMs, url, time) {

      if (!message || message.length === 0) {
        console.error('Cannot send empty application notification');
      }

      console.error('Notification: ', message);

      var notification = {
        type: 'ERROR',
        message: message,
        url: url,
        durationInMs: durationInMs
      };
      $rootScope.$broadcast('notification', notification);
    }

    function clear() {
      $rootScope.$broadcast('clearNotifications');
    }

////////////////////////////////////////////
// Method Visibility
////////////////////////////////////////////
    return {

      sendMessage: sendMessage,
      sendWarning: sendWarning,
      sendError: sendError,
      clear: clear
    };
  }]);
