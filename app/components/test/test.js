'use strict';

angular.module('singleConceptAuthoringApp.test', [
  //insert dependencies here
  'ngRoute'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/test', {
        controller: 'TestCtrl',
        templateUrl: 'components/test/test.html'
      });
  })

  .controller('TestCtrl', function TestCtrl($scope, $rootScope, $interval, notificationService, languageService) {

      $rootScope.pageTitle = 'Test Management';

      $scope.getTestSpellingWords = languageService.getTestSpellings;
      $scope.testText = 'Hey! You mispelled whiskee!'

      console.log('Entered TestCtrl');

      /* tinymce.init({
       selector: "textarea",  // change this value according to your HTML
       plugins: "spellchecker",
       menubar: "tools",
       toolbar: "spellchecker",
       spellchecker_callback: function(method, text, success, failure) {
       languageService.testspellcheck(text).then(function(suggestions) {
       success(suggestions);
       });
       }
       });*/

      var tinymceEditor;

      $scope.tinymceOptions = {
        setup: function (ed) {

          tinymceEditor = ed;
          ed.on('focus', function () {
            console.debug('focus');
            enableSpellcheck();
          });
          ed.on('blur', function () {
            console.debug('blur');
            disableSpellcheck();
          });
          console.debug(ed);
        },

        // required to not add &nbsp; on paste events
        entity_encoding: 'raw',

        // strip all p and br elements added automatically
        invalid_elements: 'p,br',

        // do not wrap blocks
        forced_root_block: false,

        selector: "textarea",  // change this value according to your HTML
        plugins: "spellchecker",
        menubar: false,
        toolbar: false,
        statusbar: false,
        paste_auto_cleanup_on_paste: true,
        spellchecker_callback: function (method, text, success, failure) {
          languageService.testspellcheck(text).then(function (suggestions) {
            success(suggestions);
          });
        }
      }
      ;

      var isSpellchecked = false;

      $scope.spellcheck = function () {
        if (isSpellchecked) {
          tinymceEditor.execCommand('mceSpellcheck');
        }
      }

      function enableSpellcheck() {
        // if not currently spell checking and enable flag set, execute to enable
        if (!isSpellchecked) {
          console.debug('enabling spellcheck');
          isSpellchecked = true
          $scope.spellcheck();
         ;
        } else {
          console.debug('spellcheck already enabled');

        }
      };
      function disableSpellcheck() {
        // if disable request and currently spell checked, execute once to disable
        if (isSpellchecked) {
          console.debug('disabling spellcheck');

          isSpellchecked = false;
          tinymceEditor.execCommand('mceSpellcheck');
        } else {
          console.debug('spellcheck already disabled');
        }
      };


// notification testing variables
      $scope.notificationType = 'Message';
      $scope.notificationText = 'Validation completed for task WRPSII-86';
      $scope.notificationUrl = '#/tasks/task/WRPSII/WRPSII-86/validate';
      $scope.notificationDuration = 0;

      $scope.sendNotification = function () {
        switch ($scope.notificationType) {
          case 'Message':
            notificationService.sendMessage($scope.notificationText, $scope.notificationDuration, $scope.notificationUrl);
            break;
          case 'Warning':
            notificationService.sendWarning($scope.notificationText, $scope.notificationDuration, $scope.notificationUrl);
            break;
          case 'Error':
            notificationService.sendError($scope.notificationText, $scope.notificationDuration, $scope.notificationUrl);
            break;
        }
      }


    }
  )
;
