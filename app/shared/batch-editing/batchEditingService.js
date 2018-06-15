'use strict';

/**
 * Promotion Service
 * Provides validation and prerequisite testing for task and project promotion
 */
angular.module('singleConceptAuthoringApp')
  .service('batchEditingService', ['scaService', 'snowowlService', '$q', '$timeout','$compile', 'componentAuthoringUtil', 'templateService', 'constraintService',
    function (scaService, snowowlService, $q, $timeout, $compile, componentAuthoringUtil, templateService, constraintService) {

      //
      // Service variables
      //

      var currentScope;
      var currentTask;
      var currentTemplate;
      var batchConcepts;
      var fsnToIdMap = {};       // map of fsn to SCTID used by target slots


      //
      // Initialization Functions
      //

      function initializeFromScope(scope) {
        batchConcepts = [];
        currentTemplate = null;
        var deferred = $q.defer();
        currentScope = scope;
        initializeFromTask(scope.task).then(function() {
          deferred.resolve(batchConcepts);
        }, function(error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function initializeFromTask(task) {
        var deferred = $q.defer();
        currentTask = task;
        getBatchUiState().then(function (concepts) {
          batchConcepts = concepts;
          if (batchConcepts && batchConcepts.length > 0) {
            currentTemplate = batchConcepts[0].template;
          }
          angular.forEach(concepts, function(c) {
            c.tableAction = null;
            c.errorMsg = null;
          });
          deferred.resolve();
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function getCurrentTemplate() {
        return currentTemplate;
      }

      function setCurrentTemplate(template) {
        currentTemplate = template;
      }

      //
      // UI State Functions
      //
      function updateBatchUiState() {
        var deferred = $q.defer();
        if (!currentTask) {
          deferred.reject('Batch service error: task not set');
        } else {
          scaService.saveUiStateForTask(currentTask.projectKey, currentTask.key, 'batch-concepts', batchConcepts).then(function () {
            deferred.resolve();
          }, function (error) {
            deferred.reject('UI State Error: ' + error.message);
          });
        }
        return deferred.promise;

      }

      function getBatchUiState() {
        var deferred = $q.defer();
        if (!currentTask) {
          deferred.reject('Batch service error: task not set');
        } else {
          scaService.getUiStateForTask(currentTask.projectKey, currentTask.key, 'batch-concepts').then(function (concepts) {
            deferred.resolve(concepts);
          }, function (error) {
            deferred.reject('UI State Error: ' + error.message);
          });
        }
        return deferred.promise;

      }

      function getConceptIdForFsn(fsn) {
        return fsnToIdMap[fsn];
      }

      //
      // CRUD operations
      //


      function setBatchConcepts(concepts) {
        var deferred = $q.defer();
        batchConcepts = concepts;

        updateBatchUiState().then(function () {
          deferred.resolve();
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function getBatchConcepts() {
        return batchConcepts;
      }

      function getBatchConcept(conceptId) {
        try {
          return batchConcepts.filter(function (c) {
            return c.conceptId === conceptId;
          })[0];
        } catch (e) {
          return null;
        }
      }

      function addBatchConcept(concept) {
        var deferred = $q.defer();
        if (!batchConcepts) {
          batchConcepts = [];
        }
        batchConcepts.push(concept);
        updateBatchUiState().then(function () {
          deferred.resolve();
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function addBatchConcepts(concepts) {
        var deferred = $q.defer();
        if (!batchConcepts) {
          batchConcepts = [];
        }
        batchConcepts = batchConcepts.concat(concepts);
        updateBatchUiState().then(function () {
          deferred.resolve();
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function updateBatchConcept(concept, previousConceptId, skipUpdateBatchUiState) {
        var deferred = $q.defer();
         if (!batchConcepts) {
          deferred.reject('Cannot update batch concept, batch concepts not initialized');
        } else {

          var conceptIdArray = batchConcepts.map(function (c) {
            return c.conceptId
          });
          // find by model concept id first
          var index = conceptIdArray.indexOf(concept.conceptId);

          // if concept id not found, check against previous concept id if supplied
          // intended for use on concept creation (new SCTID assigned)
          if (index === -1 && previousConceptId) {
            index = conceptIdArray.indexOf(previousConceptId);
          }

          if (index === -1) {
            deferred.reject('Cannot update batch concept, no concept with id found');
          } else {
            batchConcepts[index] = concept;
          }


        }
        if (skipUpdateBatchUiState) {
          deferred.resolve(concept);
        } else {
          updateBatchUiState().then(function () {
            deferred.resolve(concept);
          }, function (error) {
            deferred.reject(error);
          });
        }
        
        return deferred.promise;
      }

      function removeBatchConcept(conceptId, skipUpdateBatchUiState) {
        var deferred = $q.defer();
        if (!batchConcepts) {
          batchConcepts = [];
        }
        var index = batchConcepts.map(function (c) {
          return c.conceptId
        }).indexOf(conceptId);
        batchConcepts.splice(index, 1);
        if (!skipUpdateBatchUiState) {
          updateBatchUiState().then(function () {
            deferred.resolve();
          }, function (error) {
            deferred.reject(error);
          });
        }  else {
           deferred.resolve();
        }      
        return deferred.promise;
      }

      return {

        // initialization
        initializeFromScope : initializeFromScope,

        // Utility functions
        getConceptIdForFsn : getConceptIdForFsn,
        getCurrentTemplate : getCurrentTemplate,
        setCurrentTemplate : setCurrentTemplate,

        // CRUD operations
        setBatchConcepts: setBatchConcepts,
        getBatchConcepts: getBatchConcepts,
        getBatchConcept: getBatchConcept,
        addBatchConcept: addBatchConcept,
        addBatchConcepts: addBatchConcepts,
        updateBatchConcept: updateBatchConcept,
        removeBatchConcept: removeBatchConcept,
        updateBatchUiState: updateBatchUiState

      }
    }

  ])
;

