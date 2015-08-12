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
  .service('notificationService', ['$rootScope', '$interval', 'scaService', function ($rootScope, $interval, scaService) {
    // polling variable
    var scaPoll = null;

    // start polling
    function startScaPolling(intervalInMs) {
      console.debug('Starting notification polling with interval ' + intervalInMs + 'ms');

      // instantiate poll (every 10s)
      scaPoll = $interval(function () {

          scaService.getNotifications().then(function (response) {
            if (response && response.data && response.data[0]) {

              console.debug('NEW NOTIFICATION', response);

              // getNotifications returns an array, get the latest
              // TODO Fold all results into a drop-down list in top right corner
              var newNotification = response.data[0];

              var msg = '';
              var url = '';

              if (newNotification.entityType) {

                // construct message and url based on entity type
                switch(newNotification.entityType) {

                  /*
                  Classification completion object structure
                   entityType: "Classification"
                   event: "Classification completed successfully"
                   project: "WRPAS"
                   task: "WRPAS-98" (omitted for project)
                   */
                  case 'Classification':
                    msg = newNotification.event + ' for project ' + newNotification.project + (newNotification.task ? ' and task ' + newNotification.task : '');
                    if (newNotification.task) {
                      url = '#/classify/' + newNotification.project + '/' + newNotification.task;
                    } else {
                      url = '#/project/' + newNotification.project;
                    }
                    break;

                   /*
                   Validation completion object structure
                   entityType: "Validation"
                   event: "COMPLETED"
                   project: "WRPAS"
                   task: "WRPAS-98" (omitted for project)
                   */
                  case 'Validation':

                    // conver
                    var event = newNotification.event.toLowerCase().replace(/\w\S*/g, function (txt) {
                      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                    });
                    msg = 'Validation ' + event + ' for project' + newNotification.project + (newNotification.task ? ' and task ' + newNotification.task : '');
                    if (newNotification.task) {
                      url = '#/validate/' + newNotification.project + '/' + newNotification.task;
                    } else {
                      url = '#/project/' + newNotification.project;
                    }
                    break;
                }
              } else {
                msg = 'Unknown notification received';
              }
              // broadcast the time, message, link, and raw data
              $rootScope.$broadcast('notification', {time: new Date(), message: msg, url: url, data: newNotification, durationInMs: 0});
            }
          });
        }, intervalInMs);
    }

    // stop polling
    function stopScaPolling() {
      console.debug('Canceling notification polling');
      if (scaPoll) {
        $interval.cancel(scaPoll);
      }
    }

    // force a notification to be sent from elsewhere in the app
    // simple broadcast, but ensures event text is uniform
    function sendNotification(message, durationInMs) {
      console.debug('Sending app-wide notification',message);

      var notification = {
        time: null,
        message: message,
        url: null,
        data: '',
        durationInMs: durationInMs
      };
      $rootScope.$broadcast('notification', notification);
    }

////////////////////////////////////////////
// Method Visibility
// TODO All methods currently visible!
////////////////////////////////////////////
    return {

      startScaPolling: startScaPolling,
      stopScaPolling: stopScaPolling,
      sendNotification: sendNotification
    };
  }]);