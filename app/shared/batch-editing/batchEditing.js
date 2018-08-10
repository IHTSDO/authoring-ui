'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('batchEditing', ['$rootScope', '$compile', '$filter', '$timeout', '$q', 'ngTableParams', 'modalService', 'componentAuthoringUtil', 'templateService', 'batchEditingService', 'scaService', 'snowowlService', 'constraintService', 'notificationService', 'metadataService', '$modal',
    function ($rootScope, $compile, $filter, $timeout, $q, ngTableParams, modalService, componentAuthoringUtil, templateService, batchEditingService, scaService, snowowlService, constraintService, notificationService, metadataService, $modal) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // branch
          branch: '=',

          // task
          task: '='
        },
        templateUrl: 'shared/batch-editing/batchEditingNgTable.html',

        link: function (scope, element, attrs, linkCtrl) {

          scope.viewedConcepts = [];  // concepts opened for editing by user

          scope.templateSlots = [];

          // template options
          scope.templateOptions = {
            availableTemplates : [],
            selectedTemplate: null
          };
          scope.isBatchLoaded = false;

          //
          // Utility functions from services
          //
          scope.isSctid = snowowlService.isSctid;

          //
          // NgTable functions
          //

          function applyNgTableSortingParams(concept) {
            concept.sctid = snowowlService.isSctid(concept.conceptId) ? concept.conceptId : '';
            concept.fsn = componentAuthoringUtil.getFsnForConcept(concept);
            angular.forEach(concept.relationships, function (r) {
              if (r.targetSlot && r.targetSlot.slotName) {
                concept[r.targetSlot.slotName] = r.target.fsn;
              }
            });
          }

          scope.updateField = function (concept, fieldName, text, id) {

          };

          function initNgTableSlots(template) {

            if (template && template.conceptOutline) {
              angular.forEach(template.conceptOutline.relationships, function (r) {
                if (r.targetSlot && r.targetSlot.slotName) {
                  var add = true;
                  if(scope.templateSlots.length !== 0)
                      {
                          angular.forEach(scope.templateSlots, function (newR) {
                            if (r.targetSlot.slotName === newR.slotName) {
                              add = false;
                            }
                          });
                      }
                  if(add){
                      scope.templateSlots.push(r.targetSlot);
                  }
                }
              });
            }
          }

          function batchTableSort(a, b) {
            for (var key in scope.batchTableParams.sorting()) {
              var dir = scope.batchTableParams.sorting()[key] === 'asc' ? -1 : 1;
              if (a[key] < b[key]) {
                return dir
              } else if (a[key] > b[key]) {
                return dir * -1;
              }
            }
            return 0;
          }


          scope.batchTableParams = new ngTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'asc'}
            },
            {
              filterDelay: 50,
              total: batchEditingService.getBatchConcepts() ? batchEditingService.getBatchConcepts().length : 0,
              getData: function ($defer, params) {

                // initialize columns from template
                initNgTableSlots(batchEditingService.getCurrentTemplate());
                // get the current batch concepts
                var bcs = batchEditingService.getBatchConcepts();

                if (!bcs || bcs.length === 0) {
                  scope.batchHasData = false;
                  $defer.resolve([]);
                } else {

                  scope.batchHasData = true;

                  // ensure stored concepts are sorted according to current view
                  // i.e. apply sorting outside of current page to ensure batch action matching
                  //bcs.sort(batchTableSort);

                  var searchStr = params.filter().search;
                  var concepts = [];

                  if (searchStr) {
                    concepts = bcs.filter(function (item) {
                      return item.toLowerCase().indexOf(searchStr) !== -1;
                    });
                  } else {
                    concepts = bcs;
                  }

                  angular.forEach(concepts, function (c) {
                    applyNgTableSortingParams(c);
                  });

                  params.total(concepts.length);


                  concepts = params.sorting() ? $filter('orderBy')(concepts, params.orderBy()) : concepts;


                  concepts = concepts.slice((params.page() - 1) * params.count(), params.page() * params.count());

                  $defer.resolve(concepts);
                }

              }
            }
          );

          scope.getConceptsForValueTypeahead = function (concept, slotName, searchStr) {
            var deferred = $q.defer();
            // get the slot name
            try {
              var slotRelationship = concept.relationships.filter(function (r) {
                return r.targetSlot && r.targetSlot.slotName === slotName;
              })[0];
              constraintService.getConceptsForValueTypeahead(slotRelationship.type.conceptId, searchStr, scope.branch, slotRelationship.targetSlot.allowableRangeECL).then(function (response) {
                deferred.resolve(response);
              }, function (e) {
                deferred.reject();
              })
            } catch (e) {
              deferred.reject();
            }
            return deferred.promise;
          };

          scope.getRelationshipTargetDragObject = function (concept, slotName) {
            var dragObj;
            angular.forEach(concept.relationships, function (relationship) {
              if (relationship.targetSlot && relationship.targetSlot.slotName === slotName) {
                dragObj = {
                  id: relationship.target.conceptId,
                  name: relationship.target.fsn
                };
              }
            });
            return dragObj;
          };

          scope.getTableCellValue = function (concept, slotName) {
            var fsn = '';
            angular.forEach(concept.relationships, function (relationship) {
              if (relationship.targetSlot && relationship.targetSlot.slotName === slotName) {
                fsn = relationship.target.fsn;
              }
            });
            return fsn;
          };

          scope.getTableHeaderValue = function (slot) {
            return slot.slotName;
          };

          scope.dropRelationshipTarget = function (concept, slotName, data) {
            angular.forEach(concept.relationships, function (relationship) {
              if (relationship.targetSlot && relationship.targetSlot.slotName === slotName) {
                constraintService.isValueAllowedForType(relationship.type.conceptId, data.id, scope.branch,
                  relationship.template && relationship.template.targetSlot ? relationship.template.targetSlot.allowableRangeECL : null).then(function () {
                  relationship.target.conceptId = data.id;
                  relationship.target.fsn = data.name;
                  templateService.updateTargetSlot(concept, scope.templateOptions.selectedTemplate, relationship).then(function () {
                    scope.batchTableParams.reload();
                  })
                }, function (error) {
                  notificationService.sendWarning('Target slot error: ' + data.name + ' is not a valid target for slot');
                });

              }
            })
          };

// TODO Set relationship target and update target slot on typeahead select
          scope.setTargetSlot = function (concept, slotName, data) {
            angular.forEach(concept.relationships, function (r) {
              if (r.targetSlot && r.targetSlot.slotName === slotName) {
                r.target.conceptId = data.id;
                r.target.fsn = data.fsn.term;
                templateService.updateTargetSlot(concept, concept.template, r).then(function () {
                  batchEditingService.updateBatchConcept(concept).then(function () {
                    scope.batchTableParams.reload();
                  })
                });
              }
            })
          };

          // checks for empty assignments
          scope.cleanTargetSlot = function (concept, slotName) {
            if (!concept[slotName]) {
              scope.setTargetSlot(concept, slotName, {id: null, fsn: {term: null}});
            }
          };

//
// User action functions
//
          function createTemplateConcepts(template, batchSize) {

            var deferred = $q.defer();

            // store the selected template for use by conceptEdit.js
            templateService.selectTemplate(template);

            var concepts = [];
            var promises = [];

            for (var i = 0; i < batchSize; i++) {
              promises.push(templateService.createTemplateConcept(template));
            }

            $q.all(promises).then(function (concepts) {
              deferred.resolve(concepts);
            }, function (error) {
              deferred.reject('Error creating template concepts: ' + error);
            });

            return deferred.promise;


          }

          scope.addBatchConceptsFromTemplate = function (template, batchSize) {

            batchEditingService.setCurrentTemplate(template);
            initNgTableSlots(template);

            notificationService.sendMessage('Adding ' + batchSize + ' concepts from template ' + template.name + '...');

            createTemplateConcepts(template, batchSize).then(function (concepts) {

              // add to the existing batch concepts
              batchEditingService.addBatchConcepts(concepts).then(function () {
                notificationService.sendMessage(' Concepts added', 3000);
                scope.batchTableParams.reload();
              });
            });
          };

          scope.getTitle = function(slot){
              if(slot){
                  return slot.slotName;
              }
          }

          scope.clearConcepts = function () {

            scope.viewedConcepts = [];
            batchEditingService.setBatchConcepts([]).then(function () {
              scope.batchTableParams.reload();
              notificationService.sendMessage('Concepts removed from batch', 3000);
            })
          };

          scope.editConcept = function (concept) {
            if (scope.viewedConcepts.filter(function (c) {
                return c.conceptId === concept.conceptId;
              }).length === 0) {
              if(scope.transform){
                  notificationService.sendMessage('Loading concept...', 10000, null);
                  snowowlService.getFullConcept(concept.conceptId, scope.branch).then(function(beforeConcept){
                        let project = scope.task.branchPath;
                        scope.beforeConcept = beforeConcept;
                        scope.parentBranch = project.substr(0, project.lastIndexOf("\/"));
                        console.log(scope.task.branchPath);
                        scope.viewedConcepts = [];
                        scope.viewedConcepts.push(concept);
                        notificationService.sendMessage('Concept Loaded', 1000, null);
                  });
              }
              else{
                    scope.viewedConcepts = [];
                    scope.viewedConcepts.push(concept);
              }
              
            } else {
              notificationService.sendWarning('Concept already added', 3000);
            }
          };

          //
          // Validation Functions
          //

          function validateAllHelper(concepts) {

            if (!concepts || concepts.length === 0) {
              return;
            }

            var concept = concepts[0];

            var tableConcept;

            try {
              tableConcept = scope.batchTableParams.data.filter(function (c) {
                return c.conceptId === concept.conceptId;
              })[0];
            } catch (e) {
              // do nothing
            }
            if (tableConcept) {
              tableConcept.tableAction = 'Validating...';
            }

            getValidationResultForConcept(concept, true).then(function (validationResult) {
              if (tableConcept) {
                tableConcept.tableAction = null;
                tableConcept.validation = validationResult;
              }
              validateAllHelper(concepts.slice(1));

            }, function (error) {
              if (tableConcept) {
                tableConcept.tableAction = null;
                tableConcept.errorMsg = error;
              }
              validateAllHelper(concepts.slice(1));
            });

          }

          scope.validateAll = function () {
            angular.forEach(scope.batchTableParams.data, function (c) {
              c.validation = null;
              c.errorMsg = null;
              c.tableAction = 'Waiting...'
            });
            var concepts = batchEditingService.getBatchConcepts().sort(batchTableSort);
            validateAllHelper(concepts);
          };

          //
          // Gets validation result while retaining all locally assigned ids
          // invoked from validateConcept and saveConcept
          //
          function getValidationResultForConcept(concept) {
            var deferred = $q.defer();

            var conceptCopy = angular.copy(concept);

            if (!componentAuthoringUtil.checkConceptComplete(concept)) {
              concept.errorMsg = 'Incomplete';
            } else {

              snowowlService.validateConcept(scope.task.projectKey,
                scope.task.key,
                conceptCopy,
                true // retain temporary ids
              ).then(function (validationResults) {
                var results = {
                  hasWarnings: false,
                  hasErrors: false,
                  warnings: {},
                  errors: {}
                };

                angular.forEach(validationResults, function (validationResult) {
                  if (validationResult.severity === 'WARNING') {
                    results.hasWarnings = true;
                    if (!results.warnings[validationResult.componentId]) {
                      results.warnings[validationResult.componentId] = [];
                    }
                    results.warnings[validationResult.componentId].push(validationResult.message);
                  }

                  else if (validationResult.severity === 'ERROR') {
                    results.hasErrors = true;
                    if (!results.errors[validationResult.componentId]) {
                      results.errors[validationResult.componentId] = [];
                    }
                    results.errors[validationResult.componentId].push(validationResult.message);
                  }
                });

                deferred.resolve(results);
              }, function (error) {
                deferred.reject(error);
              });
            }


            return deferred.promise;
          }


          scope.validateConcept = function (concept, skipUpdateBatchUiState) {
            var deferred = $q.defer();

            concept.errorMsg = null;
            concept.validation = null;

            var template = concept.template;

            concept.tableAction = 'Validating...';
            concept.validation = null;
            var originalConceptId = concept.conceptId;
            getValidationResultForConcept(concept).then(function (validationResult) {

              concept.validation = validationResult;
              concept.tableAction = null;

              batchEditingService.updateBatchConcept(concept, originalConceptId, skipUpdateBatchUiState).then(function () {
                deferred.resolve(concept);
              }, function (error) {
                deferred.reject(error);
              });

            });


            return deferred.promise;
          };

//
// Save Functions
//

// update the actual concept from row values\

          function saveAllHelper(concepts) {

            if (concepts.length === 0) {
              $rootScope.$broadcast('batchEditing.batchSaveComplete');
              return;
            }
            var concept = concepts[0];

            var tableConcept;

            try {
              tableConcept = scope.batchTableParams.data.filter(function (c) {
                return c.conceptId === concept.conceptId;
              })[0];
            } catch (e) {
              // do nothing
            }


            scope.saveConcept(tableConcept ? tableConcept : concept, true).then(function (response) {
              if (tableConcept) {
                tableConcept.tableAction = null;
                scope.batchTableParams.reload();
              }
              var temp = concepts.slice(1);
                if(!response.validation.hasErrors && !response.validation.hasWarnings){
                    $rootScope.$broadcast('batchEditing.conceptSaved');
                    tableConcept.tableAction = 'Saved...';
                    $timeout(function () {
                        scope.removeConcept(concept);
                        scope.batchTableParams.reload();
                      }, 2500);
                }
                else if(response.validation.hasErrors){
                    $rootScope.$broadcast('batchEditing.conceptSavedWithErrors');
                }
                else {
                    $rootScope.$broadcast('batchEditing.conceptSavedWithWarnings');
                }
              saveAllHelper(temp);

            }, function (error) {
              if (tableConcept) {
                tableConcept.tableAction = null;
              } else {
                concept.tableAction = null;
              }
              $rootScope.$broadcast('batchEditing.conceptSavedWithErrors');
              saveAllHelper(concepts.slice(1));
            });
          }


          scope.saveAll = function () {
            scope.batchTableParams.reload();
            $timeout(function () {
                angular.forEach(scope.batchTableParams.data, function (c) {
                  c.errorMsg = null;
                  c.tableAction = 'Waiting...';
                });
                var concepts = batchEditingService.getBatchConcepts().sort(batchTableSort);
                var modalInstance = $modal.open({
                  templateUrl: 'shared/batch-editing/saveModal.html',
                  controller: 'saveModalCtrl',
                  resolve: {
                    concepts: function () {
                      return concepts;
                    }
                  }
                });
                //saveAllHelper(concepts);
                bulkSaveConcepts(concepts);
              }, 1000);

          };

          scope.saveConcept = function (originalConcept) {

            originalConcept.errorMsg = null;
            originalConcept.validation = null;

            var deferred = $q.defer();

            // check for completion
            var completionErrors = componentAuthoringUtil.checkConceptComplete(originalConcept);

            if (completionErrors.length > 0) {
              originalConcept.errorMsg = 'Incomplete';
              deferred.reject('Incomplete');
            } else {

              var concept = angular.copy(originalConcept);
//              angular.forEach(originalConcept.descriptions, function(desc){
//                  angular.forEach(concept.descriptions, function(newDesc){
//                          if(desc.term === newDesc.term){
//                              newDesc.descriptionId = desc.descriptionId;
//                          }
//                      })
//                  });
//              angular.forEach(originalConcept.relationships, function(rel){
//                  angular.forEach(concept.relationships, function(newRel){
//                          if(rel.groupId === newRel.groupId && rel.target.conceptId === newRel.target.conceptId && rel.type.conceptId === newRel.type.conceptId){
//                              newRel.relationshipId = rel.relationshipId;
//                          }
//                      })
//                  });

              // store template
              var template = concept.template;

              // store concept id (if not an SCTID)
              var originalConceptId = concept.conceptId;

              // clean concept -- keep ids
              snowowlService.cleanConcept(concept, true);

              originalConcept.tableAction = 'Validating...';

              // first validate concept
              getValidationResultForConcept(concept).then(function (validation) {

                var saveFn = null;

                if (validation.hasErrors) {
                  originalConcept.validation = validation;
                  originalConcept.tableAction = null;
                  batchEditingService.updateBatchConcept(originalConcept, originalConceptId).then(function () {
                        originalConcept.tableAction = null;
                        var index = scope.viewedConcepts.map(function (c) {
                            return c.conceptId
                        }).indexOf(originalConcept.conceptId);
                        if (index !== -1) {
                          removeViewedConcept(originalConcept.conceptId);
                          scope.editConcept(originalConcept);
                        }
                        scope.batchTableParams.reload();
                        deferred.reject('Validation returned errors');
                  })
                } else {

                  originalConcept.tableAction = 'Saving...';

                  // clean concept again, this time stripping temp ids
                  snowowlService.cleanConcept(concept, false);

                  // In order to ensure proper term-server behavior,
                  // need to delete SCTIDs without effective time on descriptions and relationships
                  // otherwise the values revert to termserver version
                  angular.forEach(concept.descriptions, function (description) {
                    if (!description.released) {
                      delete description.descriptionId;
                    }
                  });
                  angular.forEach(concept.relationships, function (relationship) {
                    if (!relationship.released) {
                      delete relationship.relationshipId;
                    }
                  });

                  if (!concept.conceptId) {
                    saveFn = snowowlService.createConcept;
                  } else {
                    saveFn = snowowlService.updateConcept;
                  }
                  saveFn(
                    scope.task.projectKey,
                    scope.task.key,
                    concept
                  ).then(function (savedConcept) {

                    // revalidate for newly introduced warnings or new concept id reassignment
                    getValidationResultForConcept(savedConcept).then(function (newValidation) {
                      savedConcept.validation = newValidation;
                      if(newValidation.hasWarnings){
                          // replace the original concept to ensure table update
                          applyNgTableSortingParams(savedConcept);

                          templateService.applyTemplateToConcept(savedConcept, template).then(function () {

                            templateService.storeTemplateForConcept(scope.task.projectKey, savedConcept.conceptId, template);
                            templateService.logTemplateConceptSave(scope.task.projectKey, savedConcept.conceptId, originalConcept.fsn, template);

                            $rootScope.$broadcast('batchEditing.conceptChange', {
                              concept: originalConcept,
                              isModified: false,
                              previousConceptId: originalConceptId
                            });
                            batchEditingService.updateBatchConcept(savedConcept, originalConceptId).then(function () {
                              savedConcept.tableAction = null;
                              scope.batchTableParams.reload();
                              deferred.resolve(savedConcept);
                            }, function (error) {
                              notificationService.sendWarning('Concept saved, but batch failed to update: ' + error);
                              deferred.resolve(savedConcept);
                            })
                          }, function (error) {
                            notificationService.sendError('Failed to apply template: ' + error);
                            deferred.resolve(savedConcept);
                          })
                      }
                      else{
                          templateService.storeTemplateForConcept(scope.task.projectKey, savedConcept.conceptId, template);
                          templateService.logTemplateConceptSave(scope.task.projectKey, savedConcept.conceptId, originalConcept.fsn, template);
                          removeViewedConcept(originalConcept.conceptId);
                          deferred.resolve(savedConcept);
                      }



                    }, function (error) {
                      notificationService.sendError('Error saving concept: ' + error);
                      deferred.reject('Error saving concept: ' + concept.fsn);
                    });
                  });
                }

              }, function (error) {
                notificationService.sendError('Failed to validate concept ' + error);
              });

            }

            return deferred.promise;

          };

          // 1. Find any duplicated concetps from local and add them to warning list
          // 2. Validate all concepts against term server -> find warning/error/valid concepts
          // 3. Save valid and warning concepts to term server
          // 4. Save batch UI
          function bulkSaveConcepts (concepts) {
            console.log("start time : " + (new Date()));
            scope.warningConcepts = [];
            scope.errorConcepts = [];
            scope.validConcepts = [];
            scope.template = null;
            var originalConcepts = angular.copy(concepts);
              console.log(concepts);
            // looking for error/warning/valid concepts from local
            angular.forEach(concepts, function(concept, i) {
              if (componentAuthoringUtil.checkConceptComplete(concept).length > 0) {
                concept.errorMsg = 'Incomplete';
                scope.errorConcepts.push(concept);
                scope.batchTableParams.reload();
                $rootScope.$broadcast('batchEditing.conceptSavedWithErrors');
              } else if (isDuplicatedConcept(concept, i, originalConcepts)) {
                scope.warningConcepts.push(concept);
              } else {
                scope.validConcepts.push(concept);
              }
            });
              console.log(scope.validConcepts);

            // validate against Term-server for valid concepts
            var copiedValidConcepts = [];
            for (var i = 0; i < scope.validConcepts.length; i++) {
              scope.validConcepts[i].tableAction = 'Validating...';
              scope.validConcepts[i].validation = null;
              var copiedConcept = angular.copy(scope.validConcepts[i]);
              snowowlService.cleanConcept(copiedConcept, true);
              copiedValidConcepts.push(copiedConcept);
            }
            scope.template = scope.validConcepts[0].template;

            bulkValidateConcepts(copiedValidConcepts).then(function(){
              if (scope.validConcepts.length > 0) {
                var clonedConcepts = [];                
                for (var i = 0; i < scope.validConcepts.length; i++) {  
                  scope.validConcepts[i].tableAction = 'Saving...';
                  var copiedConcept = angular.copy(scope.validConcepts[i]);
                  snowowlService.cleanConcept(copiedConcept, false);
                  clonedConcepts.push(copiedConcept);           
                } 
                console.log(clonedConcepts);
                 // bulk save concepts
                snowowlService.bulkUpdateConcept(scope.branch,clonedConcepts,true).then(function(response){
                  snowowlService.bulkRetrieveFullConcept(response.conceptIds,scope.branch).then(function(concepts){
                    console.log("bulk save finish time : " + (new Date()));
                    // Save all warning concepts one-by-one
                    if ( scope.warningConcepts.length > 0) {
                      saveAllHelper(scope.warningConcepts);
                    }

                    bulkStoreAndLogTempleteConcept(concepts).then(function() {
                        // Remove concept from editing and table
                        angular.forEach(scope.validConcepts, function(concept) {
                          batchEditingService.removeBatchConcept(concept.conceptId, true).then(function () {
                            removeViewedConcept(concept.conceptId);
                            scope.batchTableParams.reload();
                          }, function (error) {
                            notificationService.sendError('Unexpected error removing batch concept: ' + error);
                          });
                        });

                        // update state after remove
                        batchEditingService.updateBatchUiState();
                        $rootScope.$broadcast('batchEditing.batchSaveConceptsComplete', {numberSavedConcepts : concepts.length});
                      });
                  });
                }, function (error) {
                  notificationService.sendError('Unexpected error saving batch concept: ' + error);
                });
              }

              // Save all warning concepts one-by-one
              if (scope.validConcepts.length == 0 && scope.warningConcepts.length > 0) {
                saveAllHelper(scope.warningConcepts);
              }
            });
          };

          function bulkValidateConcepts (concepts) {
            var deferred = $q.defer();
            snowowlService.bulkValidateConcepts(scope.branch, concepts).then(function(responses){
              console.log("validation finish time : " + (new Date()));

              angular.forEach(responses.data, function(item) {
                var validation = {
                  hasWarnings: false,
                  hasErrors: false,
                  warnings: {},
                  errors: {}
                };
                if (item.severity === 'ERROR') {
                  for (var i = 0; i < scope.validConcepts.length; i++) {
                    if (scope.validConcepts[i].conceptId === item.conceptId) {
                      if (scope.validConcepts[i].validation) {
                        validation = scope.validConcepts[i].validation ;
                      }
                      validation.hasErrors = true;
                      if (!validation.errors[item.componentId]) {
                        validation.errors[item.componentId] = [];
                      }
                      validation.errors[item.componentId].push(item.message);
                      scope.validConcepts[i].validation = validation;
                      scope.validConcepts[i].tableAction = '';
                      $rootScope.$broadcast('batchEditing.conceptSavedWithErrors');
                      break;
                    }
                  }
                } else if (item.severity === 'WARNING') {
                  for (var i = 0; i < scope.validConcepts.length; i++) {
                    if (scope.validConcepts[i].conceptId === item.conceptId) {
                      if (scope.validConcepts[i].validation) {
                        validation = scope.validConcepts[i].validation ;
                      }
                      validation.hasWarnings = true;
                      if (!validation.warnings[item.componentId]) {
                        validation.warnings[item.componentId] = [];
                      }
                      validation.warnings[item.componentId].push(item.message);
                      scope.validConcepts[i].validation = validation;
                      scope.validConcepts[i].tableAction = '';
                      break;
                    }
                  }
                } else {
                  // Do nothing
                }
              });

              // update state after validation
              batchEditingService.updateBatchUiState();

              // Re-filter for error/warning/valid concepts
              scope.warningConcepts = scope.warningConcepts.concat(scope.validConcepts.filter(function(item){return  item.validation && item.validation.hasWarnings && !item.validation.hasErrors}));
              scope.errorConcepts = scope.errorConcepts.concat(scope.validConcepts.filter(function(item){return  item.validation && item.validation.hasErrors}));
              scope.validConcepts = scope.validConcepts.filter(function(item){return  !item.validation});
              deferred.resolve();
            });

            return deferred.promise;
          }

          function bulkStoreAndLogTempleteConcept(concepts) {
            var deferred = $q.defer();
            // save template for persisted concept
            var storeTemplateForConcepts = function(idList) {
              var df = $q.defer();
              var storeTemplateForChunkConcepts = function(list, chunkSize) {
                //Split list into what will be processed and what should be held
                var processList = list.slice(0,chunkSize);
                var holdList = list.slice(chunkSize);

                var promises = [];
                for (var i = 0; i < processList.length; i++) {
                  promises.push(templateService.storeTemplateForConcept(scope.task.projectKey, processList[i], scope.template));
                }
                $q.all(promises).then(function() {
                  if(holdList.length > 0) {
                    storeTemplateForChunkConcepts(holdList, chunkSize);
                  } else {
                    df.resolve();
                  }
                });
              };
              storeTemplateForChunkConcepts(idList,10);
              return df.promise;
            }

            var promises = [];

            var conceptIds = [];
            angular.forEach(concepts, function(concept) {
              conceptIds.push(concept.conceptId);
            });
            promises.push(storeTemplateForConcepts(conceptIds));
            promises.push(templateService.bulkLogTemplateConceptSave(scope.task.projectKey, concepts, scope.template));
            $q.all(promises).then(function() {
              deferred.resolve();
            });
            return deferred.promise;
          }

          function isDuplicatedConcept(concept, index, originalConcepts) {
             angular.forEach(originalConcepts, function(originalConcept, i) {
                if (concept.fsn === originalConcept.fsn && index !== i) {
                  return true;
                }
             });

             return false;
          }

          scope.saveFunction  = function () {
            var deferred = $q.defer();
            var concept = scope.viewedConcepts[0];
            scope.saveConcept(concept).then(function (response){
              if (response.validation.hasErrors || response.validation.hasWarnings) {
                scope.viewedConcepts = [];
                $timeout(function () {
                  scope.editConcept(response);
                }, 200);

              } else {
                $timeout(function () {
                  scope.removeConcept(concept);
                }, 200);
              }
              deferred.resolve(response);
            }, function (error) {
              scope.viewedConcepts = [];
              $timeout(function () {
                  scope.editConcept(concept);
              }, 200);
              deferred.reject(error);
            });
            return deferred.promise;
          };

          scope.removeConcept = function (concept) {

            batchEditingService.removeBatchConcept(concept.conceptId).then(function () {
              removeViewedConcept(concept.conceptId);
              scope.batchTableParams.reload();

            }, function (error) {
              notificationService.sendError('Unexpected error removing batch concept: ' + error);
            })

          };

          scope.removeAll = function () {
              batchEditingService.setBatchConcepts([]).then(function(){
                  batchEditingService.setCurrentTemplate(scope.templateOptions.selectedTemplate);
                  scope.batchTableParams.reload();
                  removeViewedConcepts();
                  $rootScope.$broadcast('batchEditing.refresh');
              });
          };


          function removeViewedConcept(conceptId) {
            var index = scope.viewedConcepts.map(function (c) {
              return c.conceptId
            }).indexOf(conceptId);
            if (index !== -1) {
              scope.viewedConcepts.splice(index, 1);
            }
          }

          function removeViewedConcepts() {
              scope.viewedConcepts = [];
          }

          scope.updateFsn = function(concept) {
            var fsnDesc = componentAuthoringUtil.getFsnDescriptionForConcept(concept);
            fsnDesc.term = concept.fsn;
            batchEditingService.updateBatchConcept(concept).then(function() {
            })
          };

          scope.updateConceptReference = function(referenceConcept) {
            scope.viewedConcepts[0] = referenceConcept;
            var fsnDesc = componentAuthoringUtil.getFsnDescriptionForConcept(scope.viewedConcepts[0]);
            scope.viewedConcepts[0].fsn = fsnDesc.term;
            batchEditingService.updateBatchConcept(scope.viewedConcepts[0]).then(function(){
              // Reload ng-table and adjust height for all textareas
              scope.batchTableParams.reload();
              $timeout(function () {
                $.each($("#batchEditingTable textarea"), function () {
                  this.style.overflowY = 'hidden';
                  this.style.height = 'auto';
                  $(this).height(this.scrollHeight);
                });
              });
            });
          }

          scope.addCssToParentElement = function($event) {
            var currentElm = $event.currentTarget;
            currentElm.parentNode.classList.add('td-box-shadow');
          };

          scope.removeCssFromParentElement= function($event) {
            var currentElm = $event.currentTarget;
            currentElm.parentNode.classList.remove('td-box-shadow');
          };

          scope.setFocusToChildElement = function($event) {
            var currentElm = $event.currentTarget;
            currentElm.children[0].focus();
          };



//
// Scope listeners
//

// watch for close events
          scope.$on('stopEditing', function (event, data) {
            removeViewedConcept(data.concept.conceptId);
          });
// watch for delete concept events
          scope.$on('removeItem', function (event, data) {
            scope.removeConcept(data.concept);
          });

// watch for save events from editing panel
          scope.$on('conceptEdit.conceptChange', function (event, data) {
            if (!data || !data.concept) {
              return;
            }

            // if validation result returned, apply to concept for storage
            if (data.validation) {
              data.concept.validation = data.validation;
            }

            batchEditingService.updateBatchConcept(data.concept, data.previousConceptId).then(function () {
              scope.batchTableParams.reload();
            });
          });


//
// Initialization
//
          function initialize() {

            // get templates for dropdown

            if(!metadataService.isTemplatesEnabled()){
                templateService.getTemplates().then(function (response) {
                    scope.templateOptions.availableTemplates = response;
                });
            }
            else{$scope.templates = null;}


            // initialize from scope
            batchEditingService.initializeFromScope(scope).then(function () {

              scope.templateOptions.selectedTemplate = batchEditingService.getCurrentTemplate();
              scope.transform = batchEditingService.isTransform();
              $timeout(function () {
                    scope.batchTableParams.reload();
                  }, 1000);
                if(!scope.transform){
                  $timeout(function () {

                      (function($) {
                          var count = 0;
                          var i = 0;
                          var panel = {};
                          for(var j = 0; j < scope.templateSlots.length; j++){
                              var item = $(".sca-batch-table table thead tr th:nth-of-type(4)");
                              var clone = item.clone();
                              item.after(clone);
                          }
                            $(".sca-batch-table table thead tr th").each(function(){
                                if(i > 2){
                                    if(scope.templateSlots[count] !== undefined)
                                        {
                                            jQuery(this).text(scope.templateSlots[count].slotName);
                                            count++;
                                        }
                                }
                                i++;
                            });
                        }(jQuery));

                      }, 1500);
                }



            })
          }


          scope.$watch('task', function () {
            if (scope.task) {
              initialize();
            }
          });

          scope.$on('batchConcept.change', function () {
            scope.templateOptions.selectedTemplate = batchEditingService.getCurrentTemplate();

            scope.batchTableParams.reload();
          });

          scope.$on('conceptEdit.validation', function (event, data) {
            data.concept.validation = data.validation;
            batchEditingService.updateBatchConcept(data.concept, data.previousConceptId).then(function () {
              scope.batchTableParams.reload();
            });
          });


        }

      }
    }
  ])
;
