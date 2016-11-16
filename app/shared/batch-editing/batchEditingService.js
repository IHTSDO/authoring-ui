'use strict';

/**
 * Promotion Service
 * Provides validation and prerequisite testing for task and project promotion
 */
angular.module('singleConceptAuthoringApp')
  .service('batchEditingService', ['scaService', 'snowowlService', '$q', 'componentAuthoringUtil', 'templateService', 'constraintService',
    function (scaService, snowowlService, $q, componentAuthoringUtil, templateService, constraintService) {

      //
      // Service variables
      //

      var currentTask;
      var batchConcepts;

      //
      // Initialization Functions
      //

      function initializeFromTask(task) {
        console.debug('batchEditingService.initializeFromTask', task);
        var deferred = $q.defer();
        currentTask = task;
        getBatchUiState().then(function (concepts) {
          batchConcepts = concepts;
          deferred.resolve();
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      //
      // UI State Functions
      //
      function updateBatchUiState() {
        var deferred = $q.defer();
        scaService.saveUiStateForTask(currentTask.projectKey, currentTask.key, 'batch-concepts', batchConcepts).then(function () {
          deferred.resolve();
        }, function (error) {
          deferred.reject('UI State Error: ' + error.message);
        });
        return deferred.promise;

      }

      function getBatchUiState() {
        var deferred = $q.defer();
        scaService.getUiStateForTask(currentTask.projectKey, currentTask.key, 'batch-concepts').then(function (concepts) {
          deferred.resolve(concepts);
        }, function (error) {
          deferred.reject('UI State Error: ' + error.message);
        });
        return deferred.promise;

      }

      //
      // HandsOnTable utility functions
      //

      function getHotRowForConcept(concept) {

        // get the slot type
        var row = {
          sctid: snowowlService.isSctid(concept.conceptId) ? concept.conceptId : '',
          conceptId: concept.conceptId,
          fsn: componentAuthoringUtil.getFsnForConcept(concept),
        };

        // get the target slots
        var slotCt = 0;
        angular.forEach(concept.relationships, function (r) {
          if (r.targetSlot && r.targetSlot.slotName) {
            row['targetSlot_' + r.targetSlot.slotName] = {
              'groupId': r.groupId,
              'type': r.type,
              'slotName': r.targetSlot.slotName,
              'target': r.target,
              'dataType': r.targetSlot ? 'text' : 'autocomplete',
              'allowableECL': r.targetSlot.allowableRangeECL
            };

          }
        });


        return row;
      }

      function updateConceptFromHotRow(row) {
        var deferred = $q.defer();
        var concept = getBatchConcept(row.conceptId);

        // apply the target slots
        var slotKeys = Object.keys(row).filter(function (key) {
          return key.indexOf('targetSlot') !== -1;
        });

        var updatePromises = [];
        angular.forEach(slotKeys, function (slotKey) {
          var targetSlot = row[slotKey]
          angular.forEach(concept.relationships, function (r) {
            if (r.groupId === targetSlot.groupId && r.type.conceptId === targetSlot.type.conceptId) {
              r.target = targetSlot.target;
              updatePromises.push(templateService.updateTargetSlot(concept, concept.template, r));
            }
          });
        });

        $q.all(updatePromises).then(function () {
          var revisedConcept = getHotRowForConcept(concept);
          deferred.resolve(revisedConcept);
        }, function (error) {
          deferred.reject(error);
        });

        return deferred.promise;
      }


      //
      // CRUD operations
      //


      function setBatchConcepts(concepts) {
        batchConcepts = concepts;
        if (task) {
          updateBatchUiState();
        }
      }

      function getBatchConcepts(concepts) {
        return batchConcepts;
      }

      function getBatchConcept(conceptId) {
        console.debug('get batch concept', conceptId, batchConcepts, batchConcepts.filter(function (c) {
          return c.conceptId === conceptId;
        }));
        try {
          return batchConcepts.filter(function (c) {
            return c.conceptId === conceptId;
          })[0];
        } catch (e) {
          return null;
        }
      }

      function addBatchConcept(concept) {
        if (!batchConcepts) {
          batchConcepts = [];
        }
        batchConcepts.push(concept);
        updateBatchUiState();
      }

      function addBatchConcepts(concepts) {
        if (!batchConcepts) {
          batchConcepts = [];
        }
        batchConcepts = batchConcepts.concat(concepts);
        updateBatchUiState();
      }

      function updateBatchConcept(concept) {
        // TODO
        updateBatchUiState();
      }

      function removeBatchConcept(conceptId) {
        console.debug('remove batch concept', conceptId);
        var deferred = $q.defer();
        if (!batchConcepts) {
          batchConcepts = [];
        }
        var index = batchConcepts.map(function (c) {
          return c.conceptId
        }).indexOf(conceptId);
        console.debug('concept index', index, console.debug(batchConcepts.map(function(c) {return c.conceptId})));
        batchConcepts.splice(index, 1);
        updateBatchUiState().then(function() {
          deferred.resolve();
        }, function(error) {
          deferred.reject(error);
        })
        return deferred.promise;
      }

      return {

        // initialization
        initializeFromTask: initializeFromTask,

        // HOT functions
        getHotRowForConcept: getHotRowForConcept,
        updateConceptFromHotRow: updateConceptFromHotRow,

        // CRUD operations
        setBatchConcepts: setBatchConcepts,
        getBatchConcepts: getBatchConcepts,
        getBatchConcept: getBatchConcept,
        addBatchConcept: addBatchConcept,
        addBatchConcepts: addBatchConcepts,
        updateBatchConcept: updateBatchConcept,
        removeBatchConcept: removeBatchConcept

      }
    }]);
