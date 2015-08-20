'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('scaHeader', ['$rootScope', '$timeout', function ($rootScope, $timeout) {
    return {
      restrict: '',
      transclude: false,
      replace: true,
      scope: true,
      templateUrl: 'components/header/header.html',

      link: function (scope, element, attrs) {

        // timeout variable for current notification
        var timeout = null;

        // function to format date to required form
        scope.formatDate = function (date) {
          var hours = date.getHours();
          var minutes = date.getMinutes();
          var ampm = hours >= 12 ? 'pm' : 'am';
          hours = hours % 12;
          hours = hours ? hours : 12; // the hour '0' should be '12'
          minutes = minutes < 10 ? '0' + minutes : minutes;
          var strTime = hours + ':' + minutes + ' ' + ampm;
          var offset = String(String(new Date().toString()).split('(')[1]).split(')')[0];
          return date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + '  ' + strTime + ' (' + offset + ')';
        };

        // Expected format from notificationService.js
        // {message: ..., url: ..., durationInMs: ...}
        scope.$on('notification', function (event, notification) {

          // console.debug('Received notification', notification);

          if (notification) {

            // cancel any existing timeout
            if (timeout) {
              $timeout.cancel(timeout);
            }

            // set the notification
            scope.notification = notification;

            // if a duration supplied, apply it
            if (notification.durationInMs > 0) {
              timeout = $timeout(function () {
                scope.notification = null;
              }, notification.durationInMs);
            }
          }

          // clear notification (by user request)
          scope.clearNotification = function () {
            scope.notification = null;
          };

          // watch for changes in page title to format breadcrumbs
          scope.$watch('pageTitle', function () {
            if ($rootScope.pageTitle) {
              scope.titleSections = $rootScope.pageTitle.split('/');
            }
          });

        });
      }
    };
  }]);