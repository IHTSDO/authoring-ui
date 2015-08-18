'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('header', ['$rootScope', '$timeout', function ($rootScope, $timeout) {
    return {
      restrict: '',
      transclude: false,
      replace: true,
      scope: true,
      templateUrl: 'components/header/header.html',

      link: function (scope, element, attrs) {

        var timeout = null;

        // Expected format from notificationService.js
        // {time: [Date], message: [String], url: [String], data: {JSON},
        // durationInMs: [String]}
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

          // watch for changes in page title to format breadcrumbs
          scope.$watch('pageTitle', function () {
            if ($rootScope.pageTitle) {
              scope.titleSections = $rootScope.pageTitle.split('/');
            }
          });

          // clear notification (by user request)
          scope.clearNotification = function () {
            scope.notification = null;
          };
        });
      }
    };
  }]);