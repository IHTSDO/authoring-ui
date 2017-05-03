'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('scaHeader', ['$rootScope', '$timeout', '$modal', '$location', '$route', 'metadataService', 'templateService', '$routeParams', function ($rootScope, $timeout, $modal, $location, $route, metadataService, templateService, $routeParams) {
    return {
      restrict: '',
      transclude: false,
      replace: true,
      scope: true,
      templateUrl: 'components/header/header.html',
      link: function (scope, element, attrs) {

        // timeout variable for current notification
        var timeout = null;

        // template selection
        scope.getSelectedTemplate = templateService.getSelectedTemplate;
        scope.clearTemplate = function() {
          templateService.clearSelectedTemplate();
        };

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
            return $rootScope.currentTask.summary;
          }

          // otherwise try to match against the existing projects list
          else {

            var projects = metadataService.getProjects();
            if(projects)
            {
                var matchingProjects = projects.filter(function (el) {
                  return el.key === titleSection;
                });
                if (matchingProjects.length > 0) {
                  return matchingProjects[0].title;
                } else {
                  return null;
                }
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
            if (response) {
              // do nothing -- user preferences ctrl should make appropriate
              // changes on completion
            }
          }, function () {
          });
        };

        scope.gotoMyTasks = function() {
          $location.url('home');
        };

        scope.gotoReviewTasks = function() {
          $location.url('review-tasks');
        };

        scope.gotoMyProjects = function() {
          $location.url('my-projects');
        };

        scope.gotoAllProjects = function() {
            
          $location.url('projects');
        };

        scope.openBrowser = function() {
          if(window.location.href.indexOf("task") > -1) {
              window.open('/browser/?branch=' + $rootScope.currentTask.branchPath, '_blank');
            }
          else if(window.location.href.indexOf("project") > -1) {
              window.open('/browser/?branch=' + metadataService.getBranchRoot() + '/' + $routeParams.projectKey, '_blank');
            }
//          else if(){
//            }
          else{
              window.open('/browser', '_blank');
          }
          
        };
      }
    };
  }]);
