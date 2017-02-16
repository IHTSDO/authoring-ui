'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('batchEditing', ['$rootScope', '$compile', '$filter', '$timeout', '$q', 'ngTableParams', 'modalService', 'componentAuthoringUtil', 'templateService', 'batchEditingService', 'scaService', 'snowowlService', 'constraintService', 'notificationService',
    function ($rootScope, $compile, $filter, $timeout, $q, ngTableParams, modalService, componentAuthoringUtil, templateService, batchEditingService, scaService, snowowlService, constraintService, notificationService) {
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

            scope.hasProcSite = false;
            scope.hasAction = false;

            if (template) {
              angular.forEach(template.conceptOutline.relationships, function (r) {
                if (r.targetSlot && r.targetSlot.slotName) {
                  switch (r.targetSlot.slotName) {
                    case 'procSite':
                      scope.hasProcSite = true;
                      break;
                    case 'action':
                      scope.hasAction = true;
                      break;
                    default:
                      break;
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

                console.debug(scope.batchTableParams);

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
                  bcs.sort(batchTableSort);

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

                  console.debug('CONCEPTS', concepts);
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

          scope.dropRelationshipTarget = function (concept, slotName, data) {
            angular.forEach(concept.relationships, function (relationship) {
              if (relationship.targetSlot && relationship.targetSlot.slotName === slotName) {
                constraintService.isValueAllowedForType(relationship.type.conceptId, data.id, scope.branch,
                  relationship.template && relationship.template.targetSlot ? relationship.template.targetSlot.allowableRangeECL : null).then(function () {
                  relationship.target.conceptId = data.id;
                  relationship.target.fsn = data.name;
                  console.debug('scope.templateOptions', scope.templateOptions);
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
              console.debug('edit concept', concept);
              scope.viewedConcepts.push(concept);
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

            console.debug('Validating ', concepts[0].fsn);

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
            console.debug('validating', conceptCopy);

            if (!componentAuthoringUtil.checkConceptComplete(concept)) {
              concept.errorMsg = 'Incomplete';
            } else {

              snowowlService.validateConcept(scope.task.projectKey,
                scope.task.key,
                conceptCopy,
                true // retain temporary ids
              ).then(function (validationResults) {
                console.debug(concept)
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


          scope.validateConcept = function (concept) {
            var deferred = $q.defer();

            concept.errorMsg = null;
            concept.validation = null;

            var template = concept.template;

            console.debug('validateConcept', concept);

            concept.tableAction = 'Validating...';
            concept.validation = null;
            var originalConceptId = concept.conceptId;
            getValidationResultForConcept(concept).then(function (validationResult) {

              concept.validation = validationResult;
              concept.tableAction = null;

              batchEditingService.updateBatchConcept(concept, originalConceptId).then(function () {
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


            scope.saveConcept(tableConcept ? tableConcept : concept, true).then(function () {
              if (tableConcept) {
                tableConcept.tableAction = null;
                scope.batchTableParams.reload();
              }
              saveAllHelper(concepts.slice(1));

            }, function (error) {
              if (tableConcept) {
                tableConcept.tableAction = null;
              }
              saveAllHelper(concepts.slice(1));
            });
          }


          scope.saveAll = function () {
            angular.forEach(scope.batchTableParams.data, function (c) {
              c.errorMsg = null;
              c.tableAction = 'Waiting...'
            });
            var concepts = batchEditingService.getBatchConcepts().sort(batchTableSort);
            saveAllHelper(concepts);
          };

          scope.saveConcept = function (originalConcept) {

            originalConcept.errorMsg = null;
            originalConcept.validation = null;

            var deferred = $q.defer();

            console.debug('saving concept', originalConcept);

            // check for completion
            var completionErrors = componentAuthoringUtil.checkConceptComplete(originalConcept);

            if (completionErrors.length > 0) {
              originalConcept.errorMsg = 'Incomplete';
              deferred.reject('Incomplete');
            } else {

              var concept = angular.copy(originalConcept);

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
                  deferred.reject('Validation returned errors');
                } else {

                  originalConcept.tableAction = 'Saving...';

                  // clean concept again, this time stripping temp ids
                  snowowlService.cleanConcept(concept);

                  // In order to ensure proper term-server behavior,
                  // need to delete SCTIDs without effective time on descriptions and relationships
                  // otherwise the values revert to termserver version
                  angular.forEach(concept.descriptions, function (description) {
                    if (snowowlService.isSctid(description.descriptionId) && !description.effectiveTime) {
                      delete description.descriptionId;
                    }
                  });
                  angular.forEach(concept.relationships, function (relationship) {
                    if (snowowlService.isSctid(relationship.relationshipId) && !relationship.effectiveTime) {
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

                    console.debug('concept saved', template, savedConcept);

                    // revalidate for newly introduced warnings or new concept id reassignment
                    getValidationResultForConcept(savedConcept).then(function (newValidation) {
                      savedConcept.validation = newValidation;

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

          scope.removeConcept = function (concept) {

            batchEditingService.removeBatchConcept(concept.conceptId).then(function () {
              removeViewedConcept(concept.conceptId);
              scope.batchTableParams.reload();

            }, function (error) {
              notificationService.sendError('Unexpected error removing batch concept: ' + error);
            })

          };


          function removeViewedConcept(conceptId) {
            var index = scope.viewedConcepts.map(function (c) {
              return c.conceptId
            }).indexOf(conceptId);
            if (index !== -1) {
              scope.viewedConcepts.splice(index, 1);
            }
          }

          scope.updateFsn = function(concept) {
            console.debug('updateFSN', concept);
            var fsnDesc = componentAuthoringUtil.getFsnDescriptionForConcept(concept);
            fsnDesc.term = concept.fsn;
            batchEditingService.updateBatchConcept(concept).then(function() {
              console.debug('concept after update', concept);
            })
          };

//
// Scope listeners
//

// watch for close events
          scope.$on('stopEditing', function (event, data) {
            removeViewedConcept(data.concept.conceptId);
          });


// watch for save events from editing panel
          scope.$on('conceptEdit.conceptChange', function (event, data) {
            if (!data || !data.concept) {
              return;
            }

            console.debug('conceptEdit.conceptChange', data);

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
              scope.batchTableParams.reload();

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
          })


        }

      }
    }
  ])
;
