'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .controller('conceptPromotionModalCtrl', function ( $scope, $modalInstance, $filter, ngTableParams, terminologyServerService, branch, concept) {

    $scope.branch = branch;
    $scope.concept = concept;
    $scope.dependencies = [];

    $scope.tableParamsDependencies = new ngTableParams({
        page: 1,
        count: 10
      },
      {
        total: $scope.dependencies ? $scope.dependencies.length : 0,
        // of
        // data
        getData: function ($defer, params) {
          if (!$scope.dependencies) {
            $defer.resolve([]);
          } else {
            params.total($scope.dependencies.length);
            let dependenciesDisplayed = params.sorting() ? $filter('orderBy')($scope.dependencies, params.orderBy()) : $scope.dependencies;
            $defer.resolve(dependenciesDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        }
      }
    );

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.continue = function (withDependencies) {
      let results = {};
      results.withDependencies = withDependencies;
      $modalInstance.close(results);
    };

    function findDependencies() {
      let attributeTargets = [];
      angular.forEach($scope.concept.classAxioms, function(axiom) {
        angular.forEach(axiom.relationships, function(relationship) {
          if (relationship.target && relationship.target.conceptId) {
            attributeTargets.push(relationship.target.conceptId);
          }          
        });
      });
      angular.forEach($scope.concept.gciAxioms, function(axiom) {
        angular.forEach(axiom.relationships, function(relationship) {
          if (relationship.target && relationship.target.conceptId) {
            attributeTargets.push(relationship.target.conceptId);
          }
        });
      });
      // get all ancestors of all attribute targets
      let ecl = '';
      angular.forEach(attributeTargets, function(conceptId) {
        ecl += (ecl !== '' ? ' OR >> ' + conceptId : '>> ' + conceptId);
      });
      terminologyServerService.searchConcepts($scope.branch, null, ecl, null, 100, false, null, true).then(function(response) {
        if (response && response.items) {
          $scope.dependencies = response.items.filter(function(item) { return item.active && item.moduleId == concept.moduleId});          
        }
        $scope.checkingDependenciesDone = true;
        $scope.tableParamsDependencies.reload();
      });
    }

    ////////////////////////////////////
    // Initialization
    ////////////////////////////////////
    function initialize() {
      findDependencies();
    }

    initialize();
  })
;
