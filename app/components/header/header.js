'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('scaHeader', ['$rootScope', '$timeout', '$modal', '$location', '$route', 'metadataService', function ($rootScope, $timeout, $modal, $location, $route, metadataService) {
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

        // clear notification (by user request or notification)
        scope.clearNotification = function () {
          scope.notification = null;
        };

        scope.gotoNotificationLink = function () {

          // if on current page, reload to force any required refresh
          // NOTE Want to handle cases where # is supplied or not supplied
          // (really shouldn't be, but is in many cases)

          console.debug(scope.notification.url, $location.url, scope.notification.url.indexOf($location.url), $location.url().indexOf(scope.notification.url));

          if (scope.notification.url.indexOf($location.url()) !== -1 || $location.url().indexOf(scope.notification.url) !== -1) {
            $route.reload();
          } else {
            $location.path(scope.notification.url);
          }
        };

        // Expected format from notificationService.js
        // {message: ..., url: ..., durationInMs: ...}
        scope.$on('notification', function (event, notification) {

          if (notification) {

            // cancel any existing timeout
            if (timeout) {
              $timeout.cancel(timeout);
            }

            // validation checking of notification url
            if (notification.url) {
              // strip any leading #
              if (notification.url.indexOf('#') === 0) {
                notification.url = notification.url.substring(1);
              }

              // ensure path starts with /
              if (notification.url.indexOf('/') !== 0) {
                notification.url = '/' + notification.url;
              }
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
        });

        // local storage for current project
        // NOTE: task is set in edit.js as rootScope variable

        scope.parseTitleSection = function (titleSection) {

          // check if matches the current task
          if ($rootScope.currentTask && titleSection === $rootScope.currentTask.key) {
            return 'Task: ' + $rootScope.currentTask.summary;
          }

          // otherwise try to match against the existing projects list
          else {

            var projects = metadataService.getProjects();

            var matchingProjects = projects.filter(function (el) {
              return el.key === titleSection;
            });
            if (matchingProjects.length > 0) {
              return matchingProjects[0].title;
            } else {
              return 'Project details could not be retrieved';
            }
          }
        };

        scope.$on('clearNotifications', function (event, data) {
          scope.clearNotification();
        });

        // watch for changes in page title to format breadcrumbs
        scope.$watch('pageTitle', function () {
          if ($rootScope.pageTitle) {
            scope.titleSections = $rootScope.pageTitle.split('/');
          }
        });

        //////////////////////////
        // User Settings
        //////////////////////////
        scope.openSettingsModal = function () {
          var modalInstance = $modal.open({
            templateUrl: 'shared/user-preferences/userPreferences.html',
            controller: 'userPreferencesCtrl'
          });

          modalInstance.result.then(function (response) {
            console.debug('user preferences modal closed with response', response);
            if (response) {
              // do nothing -- user preferences ctrl should make appropriate
              // changes on completion
            }
          }, function () {
          });
        };
      }
    };
  }]);