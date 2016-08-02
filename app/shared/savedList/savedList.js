'use strict';
angular.module('singleConceptAuthoringApp.savedList', [])

  .controller('savedListCtrl', ['$scope', '$rootScope', '$location', '$modal', 'scaService', 'snowowlService', '$routeParams', function savedListCtrl($scope, $rootScope, $location, $modal, scaService, snowowlService, $routeParams) {

    // name of the panel for the Saved List
    var panelId = 'saved-list';

    // function to select an item from the saved list
    // broadcasts selected conceptId
    $scope.selectItem = function (item) {
      if (!item || item.editing) {
        return;
      }

      console.log(item.concept.conceptId);
      $rootScope.$broadcast('editConcept', {conceptId: item.concept.conceptId});
      item.editing = true;
    };

    $scope.clone = function (item) {
      if (item) {
        $rootScope.$broadcast('cloneConcept', {conceptId: item.concept.conceptId});
        item.editing = true;
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


          scaService.saveUiStateForUser('my-favorites-' + $routeParams.projectKey, $scope.favorites
          );
        }
      }
    };

    $scope.addToFavorites = function (item) {
      $scope.favorites.items.push(item);
      scaService.saveUiStateForUser('my-favorites-' + $routeParams.projectKey, $scope.favorites
      );
    };

    $scope.isInFavorites = function (item) {
      if (!$scope.favorites || !Array.isArray($scope.favorites.items)) {
        return false;
      }
      return $scope.favorites.items.indexOf(item) !== -1;
    };

    $scope.isEdited = function (item) {
      if (!$scope.editList || !Array.isArray($scope.editList.items)) {
        return false;
      }
      return $scope.editList.indexOf(item.concept.conceptId) !== -1;
    };
    $scope.viewConceptInTaxonomy = function (item) {
      $rootScope.$broadcast('viewTaxonomy', {
        concept: {
          conceptId: item.concept.conceptId,
          fsn: item.concept.fsn
        }
      });
    };

    $scope.getConceptPropertiesObj = function (item) {
      return {id: item.concept.conceptId, name: item.concept.preferredSynonym ? item.concept.preferredSynonym : item.concept.fsn};
    };

    $scope.openConceptInformationModal = function (result) {
      var modalInstance = $modal.open({
        templateUrl: 'shared/concept-information/conceptInformationModal.html',
        controller: 'conceptInformationModalCtrl',
        resolve: {
          conceptId: function () {
            return result.concept.conceptId;
          },
          branch: function () {
            return $scope.branch;
          }
        }
      });

      modalInstance.result.then(function (response) {
        // do nothing
      }, function () {
        // do nothing
      });
    };

    $scope.$on('conceptEdit.conceptChange', function (event, data) {
      if (!data || !data.concept) {
        console.error('Cannot handle concept modification event: concept must be supplied');
      } else {
        if ($scope.savedList) {
          // sample structure for favorites
          //{ active, concept : {active, conceptId, definitionStatus, fsn, moduleId}, editing, term}
          angular.forEach($scope.savedList.items, function (item) {

            // if concept on list, update the relevant display fields
            if (item.concept.conceptId === data.concept.conceptId) {
              item.active = data.concept.active;
              item.concept.definitionStatus = data.concept.definitionStatus;
              item.concept.fsn = data.concept.fsn;
              item.editing = true;
              scaService.saveUiStateForTask(
                $routeParams.projectKey, $routeParams.taskKey, 'saved-list', $scope.savedList
              );
            }
          });

          angular.forEach($scope.favorites.items, function (item) {

            // if concept on list, update the relevant display fields
            if (item.concept.conceptId === data.concept.conceptId) {
              item.active = data.concept.active;
              item.concept.definitionStatus = data.concept.definitionStatus;
              item.concept.fsn = data.concept.fsn;
              scaService.saveUiStateForUser('my-favorites-' + $routeParams.projectKey, $scope.favorites);
            }
          });
        }
      }
    });

    $scope.$on('stopEditing', function (event, data) {
      if (!data || !data.concept) {
        console.error('Cannot handle stop editing event: concept must be supplied');
      } else {
        if ($scope.savedList) {

          angular.forEach($scope.savedList.items, function (item) {
            if (item.concept.conceptId === data.concept.conceptId) {
              item.editing = false;
            }
          });
        }
      }
    });

    $scope.$on('removeItem', function (event, data) {
      if (!data || !data.concept) {
        console.error('Cannot handle stop editing event: concept must be supplied');
      } else {
        if ($scope.savedList) {
          angular.forEach($scope.savedList.items, function (item) {
            if (item.concept.conceptId === data.concept.conceptId) {
              var index = $scope.savedList.items.indexOf(item);
              $scope.savedList.items.splice(index, 1);
              item.editing = false;
              scaService.saveUiStateForTask(
                $routeParams.projectKey, $routeParams.taskKey, 'saved-list', $scope.savedList
              );
            }
          });
        }
      }
    });

  }]);
