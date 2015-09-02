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
      console.debug('Sending app-wide notification', message);

      if (!message || message.length === 0) {
        console.error('Cannot send empty application notification');
      }

      var notification = {
        type: 'MESSAGE',
        message: message,
        url: url,
        durationInMs: durationInMs
      };
      $rootScope.$broadcast('notification', notification);
    }

    function sendWarning(message, durationInMs, url) {
      console.debug('Sending app-wide warning', message);

      if (!message || message.length === 0) {
        console.error('Cannot send empty application notification');
      }

      var notification = {
        type: 'WARNING',
        message: message,
        url: url,
        durationInMs: durationInMs
      };
      $rootScope.$broadcast('notification', notification);
    }

    function sendError(message, durationInMs, url, time) {
      console.debug('Sending app-wide error', message);

      if (!message || message.length === 0) {
        console.error('Cannot send empty application notification');
      }

      var notification = {
        type: 'ERROR',
        message: message,
        url: url,
        durationInMs: durationInMs
      };
      $rootScope.$broadcast('notification', notification);
    }

    function clear() {
      console.debug('Clearing notifications');
      $rootScope.$broadcast('clearNotifications');
    }

////////////////////////////////////////////
// Method Visibility
// TODO All methods currently visible!
////////////////////////////////////////////
    return {

      sendMessage: sendMessage,
      sendWarning: sendWarning,
      sendError: sendError,
      clear : clear
    };
  }]);