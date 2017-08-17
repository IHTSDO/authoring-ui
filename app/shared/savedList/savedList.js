'use strict';
angular.module('singleConceptAuthoringApp.savedList', [])

  .controller('savedListCtrl', ['$scope', '$rootScope', '$location', '$modal', 'scaService', 'snowowlService', '$routeParams','savedListService', function savedListCtrl($scope, $rootScope, $location, $modal, scaService, snowowlService, $routeParams,savedListService) {

    $scope.favorites = {items: []};

    $scope.savedList = {items: []};

    $scope.initialize = function() {
      savedListService.initializeSavedList($routeParams.projectKey,$routeParams.taskKey);
    };  

    $scope.$watch(function () {
        return savedListService.favorites;
      },                       
      function(newVal, oldVal) {
        $scope.favorites = newVal;
    }, true);

    $scope.$watch(function () {
        return savedListService.savedList;
      },                       
      function(newVal, oldVal) {
        $scope.savedList = newVal;
    }, true);

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
        item.editing = true;
      }
    };

    $scope.removeItemFromSavedList = function (item) {
      savedListService.removeItemFromSavedList(item,$routeParams.projectKey, $routeParams.taskKey);     
    };

    $scope.removeItemFromFavorites = function (item) {
      savedListService.removeItemFromFavorites(item,$routeParams.projectKey)
    };

    $scope.addToFavorites = function (item) {
      savedListService.addToFavorites(item,$routeParams.projectKey);
    };

    $scope.isInFavorites = function (id) {
       if (!$scope.favorites || !$scope.favorites.items) {
          return false;
        }
        for (var i = 0, len = $scope.favorites.items.length; i < len; i++) {
          if ($scope.favorites.items[i].concept.conceptId === id) {
            return true;
          }
        }
        return false;
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
      return {
        id: item.concept.conceptId,
        name: item.concept.preferredSynonym ? item.concept.preferredSynonym : item.concept.fsn
      };
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

    function updateConceptDetails(concept) {
      if ($scope.savedList) {
        // sample structure for favorites
        //{ active, concept : {active, conceptId, definitionStatus, fsn, moduleId}, editing, term}
        savedListService.updateConceptInSavedList(concept,$routeParams.projectKey, $routeParams.taskKey);        
      }

      if ($scope.favorites) {
        savedListService.updateConceptInFavorites(concept,$routeParams.projectKey);       
      }
    }

    $scope.$on('conceptEdit.conceptChange', function (event, data) {
      if (!data || !data.concept) {
        console.error('Cannot handle concept modification event: concept must be supplied');
      } else {
        updateConceptDetails(data.concept);
      }
    });

    $scope.$on('stopEditing', function (event, data) {
      if (!data || !data.concept) {
        console.error('Cannot handle stop editing event: concept must be supplied');
      } else {
        if ($scope.savedList) {
          savedListService.stopEditingInSavedList(data);          
        }
      }
    });

    $scope.$on('crsTaskInitialized', function (event, data) {
      $scope.crsServiceInitialized = true;
    });

    $scope.$on('saveCrsConcept', function (event, data) {

      // replace the original concept id if it exists and update
      savedListService.updateCrsConceptInSavedList(data,$routeParams.projectKey, $routeParams.taskKey);     

      // remove the crs concept from the project favorites list if it exists
      // replace the original concept id if it exists and update
      savedListService.updateCrsConceptInFavorites(data,$routeParams.projectKey);  

    });


  }]);
