'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles IMS authentication, user roles, and user settings
 */
  .factory('batchEditService', function ($http, $rootScope, $q, scaService) {

      var currentTask;
      var batchConcepts;
      var uiStateName = 'batch-concepts';

      //
      // Utility functions
      //
      function updateBatchConceptsUiState() {
        var deferred = $q.defer();
        scaService.saveSharedUiStateForTask(currentTask.projectKey, currentTask.key, uiStateName, batchConcepts).then(function (response) {
          deferred.resolve(response);
        }, function (error) {
          deferred.reject(error.message);
        })
      }

      //
      // Exposed functions
      //

      function getBatchConcepts() {
        return batchConcepts;
      }

      function addBatchConcepts(concept) {
        var deferred = $q.defer();
        if (!batchConcepts) batchConcepts = [];
        batchConcepts.push(concept);
        updateBatchConceptsUiState().then(function () {
          deferred.resolve();
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function removeBatchConcepts(concept) {
        var deferred = $q.defer();
        if (!batchConcepts) deferred.reject('batch concepts not defined, cannot remove concept');
        angular.forEach(batchConcepts, function (concept) {
          batchConcepts.slice(concept.indexOf(concept), 1);
        });
        updateBatchConceptsUiState().then(function () {
          deferred.resolve();
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function setTask(task) {
        var deferred = $q.defer;

        scaService.getSharedUiStateForTask(currentTask.projectKey, currentTask.key, uiStateName).then(function (concepts) {
          deferred.resolve(concepts);
        }, function (error) {
          deferred.reject('Could not retrieve batch concepts');
        });
        deferred.resolve();
        return deferred.promise;
      }

      return {
        setTask: setTask,
        getBatchConcepts: getBatchConcepts,
        addBatchConcepts: addBatchConcepts,
        removeBatchConcepts: removeBatchConcepts
      };

    }
  )
;
