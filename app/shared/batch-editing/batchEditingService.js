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
      var hotDebounce; // debounce timer used for async operations
      var fsnToIdMap = {};       // map of fsn to SCTID used by target slots


      //
      // Initialization Functions
      //

      function initializeFromScope(scope) {
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
          if (batchConcepts.length > 0) {
            currentTemplate = batchConcepts[0].template;
          }
          deferred.resolve();
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function getCurrentTemplate() {
        return currentTemplate;
      }

      function changeTemplate(template) {
        var currentTemplate = template;
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

      //
      // HandsOnTable renderers and utility functions
      //

      function compileCell(td, elements) {
        // clear children so that re-renders don't cause duplication
        while (td.firstChild) {
          td.removeChild(td.firstChild);
        }
        angular.forEach(elements, function (el) {
          var compiled = $compile(el)(currentScope);
          td.appendChild(compiled[0]);
        });
      }

      // NOTE: Full method signature with unused parameters left for reference
      var deleteControl = function (hotInstance, td, row, col, prop, value) {
        var els = ['<a class="glyphicon glyphicon-trash" title="Remove from Batch" ng-click="removeConcept(' + row + ')">' + '</a>'];
        return compileCell(td, els);
      };

      var relationshipTarget = function (hotInstance, td, row, col, prop, value) {
        var els = ['<div contenteditable="true" style="width: 100%;" class="pull-left sourcename" drag-enter-class="sca-drag-target" drag-hover-class="sca-drag-hover" drop-channel="conceptPropertiesObj" ui-on-drop="dropRelationshipTarget(row, prop, $data)"></div>'];
        return compileCell(td, els);
      };

      var userControls = function (hotInstance, td, row, col, prop, value) {
        var els = [
          '<a class="glyphicon glyphicon-edit" title="Edit Full Concept" ng-click="editConcept(' + row + ')">' + '</a>',
          '<a class="md md-save" title="Save Concept" ng-click="saveConcept(' + row + ')">' + '</a>',
          '<a class="md md-school" title="Validate Concept" ng-click="validateConcept(' + row + ')">' + '</a>'
        ];
        return compileCell(td, els);
      };

      function getConceptIdForFsn(fsn) {
        return fsnToIdMap[fsn];
      }

      function getHotColumns(scope) {
        var columns = [];

        // push delete control
        columns.push(
          {
            title: ' ', // null/empty values render as Excel-style alphabetic title
            renderer: deleteControl,
            readOnly: true
          });

        // push SCTID and FSN
        columns.push({data: 'sctid', title: 'SCTID', readOnly: true});
        columns.push({data: 'fsn', title: 'FSN'});

        // cycle over templates and push target slots
        angular.forEach(currentTemplate.conceptOutline.relationships, function (relationship) {

          if (relationship.targetSlot && relationship.targetSlot.slotName) {

            var sourceFn = function (query, process) {

              // TODO Figure out better use than $rootScope
              $timeout.cancel(hotDebounce);
              if (query && query.length > 2) {
                hotDebounce = $timeout(function () {
                  constraintService.getConceptsForValueTypeahead(
                    relationship.type.conceptId, query, currentTask.branchPath,
                    relationship.targetSlot.allowableRangeECL)
                    .then(function (concepts) {
                      console.debug(hotDebounce, currentTask, fsnToIdMap)
                      // TODO Ideally would store only one fsn (on select), but haven't found HoT hook yet
                      angular.forEach(concepts, function (c) {
                        fsnToIdMap[c.fsn.term] = c.id;
                      });
                      process(concepts.map(function (c) {
                        return c.fsn.term
                      }));
                    }, function (error) {
                      console.error('error getting typeahead values', error);
                    })
                }, 500)
              }
            }

            columns.push({
              data: 'targetSlot_' + relationship.targetSlot.slotName + '.target.fsn',
              title: relationship.targetSlot.slotName,
              type: 'autocomplete',
              strict: true,
              source: sourceFn
            });

          }
        });

        // push right hand user controls
        columns.push({
          title: ' ', // null/empty values render as Excel-style alphabetic title
          renderer: userControls,
          readOnly: true
        })

        return columns;
      }

      function getHotRowForConcept(concept) {

        // get the slot type
        var row = {
          sctid: snowowlService.isSctid(concept.conceptId) ? concept.conceptId : '',
          conceptId: concept.conceptId,
          fsn: componentAuthoringUtil.getFsnForConcept(concept)
        };

        // get the target slots
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

        console.debug('row', row);

        // detach object references
        return angular.copy(row);
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
          var targetSlot = row[slotKey];
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

      function updateBatchConcept(concept, previousConceptId) {
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
        updateBatchUiState().then(function () {
          deferred.resolve(concept);
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function removeBatchConcept(conceptId) {
        var deferred = $q.defer();
        if (!batchConcepts) {
          batchConcepts = [];
        }
        var index = batchConcepts.map(function (c) {
          return c.conceptId
        }).indexOf(conceptId);
        batchConcepts.splice(index, 1);
        updateBatchUiState().then(function () {
          deferred.resolve();
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      return {

        // initialization
        initializeFromScope : initializeFromScope,

        // HOT functions
        getHotColumns: getHotColumns,
        getHotRowForConcept: getHotRowForConcept,
        updateConceptFromHotRow: updateConceptFromHotRow,

        // Utility functions
        getConceptIdForFsn : getConceptIdForFsn,
        getCurrentTemplate : getCurrentTemplate,
        changeTemplate : changeTemplate,

        // CRUD operations
        setBatchConcepts: setBatchConcepts,
        getBatchConcepts: getBatchConcepts,
        getBatchConcept: getBatchConcept,
        addBatchConcept: addBatchConcept,
        addBatchConcepts: addBatchConcepts,
        updateBatchConcept: updateBatchConcept,
        removeBatchConcept: removeBatchConcept

      }
    }

  ])
;
