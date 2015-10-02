'use strict';
angular.module('singleConceptAuthoringApp')
  .controller('userPreferencesCtrl', ['$rootScope', '$scope', '$modalInstance', 'accountService', 'scaService', 'notificationService',
    function userPreferencesCtrl($rootScope, $scope, $modalInstance, accountService, scaService, notificationService) {

    // retrieve the user preferences
    accountService.getUserPreferences().then(function(response) {
      $scope.userPreferences = response;
    });

    // revert settings to original
    $scope.revert = function () {
      accountService.getUserPreferences().then(function(response) {
        $scope.userPreferences = response;
      });
    };

    // close modal and apply settings
    $scope.save = function () {
      accountService.applyUserPreferences($scope.userPreferences).then(function (userPreferences) {

        accountService.saveUserPreferences(userPreferences).then(function(response) {
          if (!response) {
            notificationService.sendError('Unexpected error saving settings. Your changes may not persist across sessions', 0);
          } else {
            notificationService.sendMessage('Application preferences updated', 5000);
          }
        });
        $modalInstance.close(userPreferences);
      }, function (error) {
        $scope.errorMsg = 'Unexpected error applying settings';
      });
    };

    $scope.close = function () {
      $modalInstance.close();
    };

      /**
       * Recursive helper function to start at a layout level and check
       * children for matching element name
       * @param name
       * @param node the node to check
       * @param parentNode the node's parent node, for returning siblings and
       *   position
       * @returns {*} object containing the element and the element + its
       *   siblings
       */
      function getLayoutHelper(name, node, parentNode) {

        console.debug('getLayoutHelper', name, node, parentNode);

        if (!node) {
          node = $rootScope.layout;
        }

        // check if this node matches -- do not set other variables, if this
        // object is finally returned, indicates
        if (node.name === name) {
          return {
            'element': node,
            'levelElements': parentNode ? parentNode.children : null,
            'levelPosition': parentNode ? parentNode.children.indexOf(node) : -1
          };
        }

        // cycle over children
        if (node.children && node.children.length) {
          for (var i = 0; i < node.children.length; i++) {
            var childResult = getLayoutHelper(name, node.children[i], node);
            if (childResult) {
              return childResult;
            }
          }
        }
        return null;
      }

      ///////////////////////////////////////
      // Layout stuffs
      // TODO:  Move this stuff into a location service
      ///////////////////////////////////////

      /**
       * Increment the size of a layout column element
       * @param name unique name of the element
       * @param increment columns increased (positive) or decreased (negative)
       */
      $scope.resizeLayoutElement = function (name, increment) {

        console.debug('resizeLayoutElement', name, increment);

        if (!name || !increment) {
          console.error('resizeLayoutElement requires both name and increment specified');
        }

        // get the element, level, and position information
        var layoutObj = getLayoutHelper(name, $rootScope.layout);

        if (!layoutObj) {// || !layoutObj.element || !layoutObj.levelElements ||
                         // !layoutObj.levelPosition) {
          console.error('Could not retrieve required layout object information, got instead:', layoutObj);
        }

        // check that at least two elements exist
        if (layoutObj.levelElements.length < 3) {
          console.warn('Less than 2 elements, aborting resizing');
        }

        // if the element is the last element on the level, pick element to the
        // left
        if (layoutObj.levelPosition === layoutObj.levelElements.length - 1) {
          console.warn('Cannot use resize controls on last element of level, aborting resizing');
          return;
        }

        // extract the element and its neighbor right for convenience
        var elem = layoutObj.element;
        var pairedElement = layoutObj.levelElements[layoutObj.levelPosition + 1];

        // check width requirements for both elements
        if (elem.width + increment < 2) {
          console.warn('Cannot resize selected element below width 2, aborting resizing');
          return;
        }
        if (pairedElement.width - increment < 2) {
          console.warn('Resizing selected element reduces another element below width 2, aborting resizing');
          return;
        }

        console.debug('passed checks!');

        // if all checks pass, resize
        elem.width += increment;
        pairedElement.width -= increment;

        // apply the layout
        $scope.setLayoutWidths($rootScope.layout);
      };

      /**
       * Flattens layout widths to a single
       * @param name
       */
      $scope.setLayoutWidths = function (node) {

        // if node not specified, start at top
        if (!node) {
          node = $rootScope.layout;
        }
        if (node === $rootScope.layout) {
          $rootScope.layoutWidths = {};
        }

        angular.forEach(node.children, function (child) {

          if ($rootScope.layoutWidths.hasOwnProperty(child.name)) {
            console.error('Duplicate node names detected:', child.name);
            return;
          }

          $rootScope.layoutWidths[child.name] = child.width;
          $scope.setLayoutWidths(child);
        });

        if (node === $rootScope.layout) {
          console.debug('layout widths', $rootScope.layoutWidths);
        }
      };

  }]);
