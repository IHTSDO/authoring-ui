'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles IMS authentication, user roles, and user settings
 */
  .service('batchEditService', function ($http, $rootScope, $q, scaService) {

      var currentTask;
      var batchConcepts;
      var uiStateName = 'batch-concepts';

      //
      // Utility functions
      //
      function getBatchConceptsUiState() {
        var deferred = $q.defer();
        scaService.getSharedUiStateForTask(currentTask.projectKey, currentTask.key, uiStateName).then(function (concepts) {
          deferred.resolve(concepts);
        }, function (error) {
          deferred.reject('Could not retrieve batch concepts:' + error.message);
        });
        return deferred.promise;
      }

      function updateBatchConceptsUiState() {
        var deferred = $q.defer();
        scaService.saveSharedUiStateForTask(currentTask.projectKey, currentTask.key, uiStateName, batchConcepts).then(function (response) {
          deferred.resolve(response);
        }, function (error) {
          deferred.reject(error.message);
        });
        return deferred.promise;
      }

      //
      // Exposed functions
      //

      function getBatchConcepts() {
        return batchConcepts ? batchConcepts : [];
      }

      function addBatchConcept(concept) {
        var deferred = $q.defer();
        if (!batchConcepts) batchConcepts = [];

        batchConcepts.push(concept);

        updateBatchConceptsUiState().then(function () {
          console.debug('batch concepts changed', batchConcepts);
          deferred.resolve();
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;

      }

      function addBatchConcepts(concepts) {
        var deferred = $q.defer();
        if (!batchConcepts) batchConcepts = [];
        angular.forEach(concepts, function (concept) {
          batchConcepts.push(concept);
        });
        updateBatchConceptsUiState().then(function () {
          console.debug('batch concepts changed', batchConcepts);
          deferred.resolve();
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function removeBatchConcept(concept) {
        var deferred = $q.defer();
        if (!batchConcepts) deferred.reject('batch concepts not defined, cannot remove concept');
        batchConcepts.slice(concept.indexOf(concept), 1);
        updateBatchConceptsUiState().then(function () {
          console.debug('batch concepts changed', batchConcepts);
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
          console.debug('batch concepts changed', batchConcepts);
          deferred.resolve();
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function setTask(task) {
        var deferred = $q.defer();
        currentTask = task;
        getBatchConceptsUiState().then(function (response) {
          batchConcepts = response;
          console.debug('batch concepts initialized', batchConcepts);
          deferred.resolve();
        }, function (error) {
          deferred.reject('Failed to set task: ' + error);
        });
        return deferred.promise;
      }

      return {
        setTask: setTask,
        getBatchConcepts: getBatchConcepts,
        addBatchConcept: addBatchConcept,
        addBatchConcepts: addBatchConcepts,
        removeBatchConcept: removeBatchConcept,
        removeBatchConcepts: removeBatchConcepts
      };

    }
  )
;
