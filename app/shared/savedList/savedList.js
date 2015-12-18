'use strict';
angular.module('singleConceptAuthoringApp.savedList', [])

  .controller('savedListCtrl', ['$scope', '$rootScope', '$location', 'scaService', 'snowowlService', '$routeParams', function savedListCtrl($scope, $rootScope, $location, scaService, snowowlService, $routeParams) {

    // name of the panel for the Saved List
    var panelId = 'saved-list';

    // function to select an item from the saved list
    // broadcasts selected conceptId
    $scope.selectItem = function (item) {
      if (!item) {
        return;
      }
      console.log(item.concept.conceptId);
      $rootScope.$broadcast('editConcept', {conceptId: item.concept.conceptId});

    };

    $scope.clone = function (item) {
      if (item) {
        $rootScope.$broadcast('cloneConcept', {conceptId: item.concept.conceptId});
      }
    };

    $scope.removeItemFromSavedList = function (item) {
      if (item) {
        var index = $scope.savedList.items.indexOf(item);
        if (index !== -1) {
          $scope.savedList.items.splice(index, 1);
          $rootScope.$broadcast('savedListRemove', {conceptId: item.concept.conceptId});

          scaService.saveUiStateForTask(
            $routeParams.projectKey, $routeParams.taskKey, 'saved-list', $scope.savedList
          );
        }
      }
    };

    $scope.removeItemFromFavorites = function (item) {
      if (item) {
        var index = $scope.favorites.items.indexOf(item);
        if (index !== -1) {
          $scope.favorites.items.splice(index, 1);


          scaService.saveUiStateForTask(
            $routeParams.projectKey, $routeParams.taskKey, 'my-favorites', $scope.favorites
          );
        }
      }
    };

    $scope.addToFavorites = function(item) {
      $scope.favorites.items.push(item);
      scaService.saveUiStateForTask(
        $routeParams.projectKey, $routeParams.taskKey, 'my-favorites', $scope.favorites
      );
    };

    $scope.isInFavorites = function(item) {
      if (!$scope.favorites || !Array.isArray($scope.favorites.items)) {
        return false;
      }
      return $scope.favorites.items.indexOf(item) !== -1;
    };

    $scope.isEdited = function(item) {
      return $scope.editList.indexOf(item.concept.conceptId) !== -1;
    };

    $scope.getConceptPropertiesObj = function (item) {
      return {id: item.concept.conceptId, name: item.concept.fsn};
    };
    $scope.$on('stopEditing', function (event, data) {
          if (!data || !data.concept) {
            console.error('Cannot handle stop editing event: concept must be supplied');
          } else {
            angular.forEach($scope.savedList.items, function (item) {
              if (item.concept.conceptId === data.concept.conceptId) {
                item.editing = false;
              }
            });
          }
        });

  }]);
