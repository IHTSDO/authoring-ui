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

    $scope.removeItem = function (item) {
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

    $scope.isEdited = function(item) {
      return $scope.editList ? $scope.editList.indexOf(item.concept.conceptId) !== -1 : false;
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
