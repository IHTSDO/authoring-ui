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

          scaService.saveUIState(
            $routeParams.projectKey, $routeParams.taskKey, 'saved-list', $scope.savedList
          );
        }
      }
    };

    /*// listen for removal of concepts from editing panel
    scope.$on('stopEditing', function(event, data) {
      if (!data || !data.concept) {
        console.error("Cannot handle stop editing event: concept must be supplied");
      } else {

        // check all current data items for edit re-enable
        angular.forEach(scope.data, function(item) {
          if (item.destinationId === data.concept.id) {
            item.isLoaded = false;
          }
        })
      }
    });
*/
    $scope.getConceptPropertiesObj = function (item) {
      return {id: item.concept.conceptId, name: item.term};
    };

  }]);
