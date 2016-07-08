'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.searchModal', [])

  .controller( 'searchModalCtrl', function AppCtrl ( $scope, $rootScope, $location, $routeParams, $compile, $modalInstance, snowowlService, searchStr) {

      //console.debug('searchModalCtrl', searchStr);

      // closes the modal instance (if applicable)
      $scope.close = function (selectedItem) {
        $modalInstance.close(selectedItem);
      };

      $scope.select = function(item) {
        $scope.close(item.concept);
      };


      $scope.search = function(searchStr) {

        if (searchStr && searchStr.length < 3) {
          return;
        }
        $scope.results = [];
        //console.debug('searching with scope value', searchStr);
        snowowlService.getDescriptionsForQuery($routeParams.projectKey, $routeParams.taskKey, searchStr).then(function(response) {
          $scope.results = response;
        })
      };

      // on load, search with passed value
      $scope.searchStr = searchStr;
      $scope.search(searchStr);

    });

