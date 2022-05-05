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
          attributeTargets.push(relationship.target.conceptId);
        });
      });
      angular.forEach($scope.concept.gciAxioms, function(axiom) {
        angular.forEach(axiom.relationships, function(relationship) {
          attributeTargets.push(relationship.target.conceptId);
        });
      });
      // get all ancestors of all attribute targets
      let ecl = '';
      angular.forEach(attributeTargets, function(conceptId) {
        ecl += (ecl !== '' ? ' OR >> ' + conceptId : '>> ' + conceptId);
      });
      terminologyServerService.searchConcepts($scope.branch, null, ecl, null, 100, false, null, true).then(function(response) {
        if (response && response.items) {
          let ancestors = [];
          angular.forEach(response.items, function(item) {
            ancestors.push(item.conceptId);
          });
          if (ancestors.length !== 0) {
            // check against MAIN to detect the dependent concepts
            terminologyServerService.searchAllConcepts('MAIN', ancestors.join(','), null, null, ancestors.length, null, null, true, false, null, 'stated').then(function(result){
              let conceptsExistingInMAIN = result.items.map(function(item) { return item.concept.conceptId });
              $scope.dependencies = response.items.filter(function(item) { return conceptsExistingInMAIN.indexOf(item.conceptId) === -1 });
              $scope.checkingDependenciesDone = true;
              $scope.tableParamsDependencies.reload();
            });
          } else {
            $scope.checkingDependenciesDone = true;
          }
        } else {
          $scope.checkingDependenciesDone = true;
        }
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
