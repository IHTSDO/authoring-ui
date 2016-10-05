'use strict';
angular.module('singleConceptAuthoringApp')

  .directive('typeaheadFocus', function () {
    return {
      require: 'ngModel',
      link: function (scope, element, attr, ngModel) {

        //trigger the popup on 'click' because 'focus'
        //is also triggered after the item selection
        element.bind('click', function () {


          var viewValue = ngModel.$viewValue;

          //restore to null value so that the typeahead can detect a change
          if (ngModel.$viewValue === ' ') {
            ngModel.$setViewValue(null);
          }

          //force trigger the popup
          ngModel.$setViewValue(' ');

          //set the actual value in case there was already a value in the input
          ngModel.$setViewValue(viewValue || ' ');
        });

        //compare function that treats the empty space as a match
        scope.emptyOrMatch = function (actual, expected) {
          if (expected === ' ') {
            return true;
          }
          return actual ? actual.toString().toLowerCase().indexOf(expected.toLowerCase()) > -1 : false;
        };
      }
    };
  });

angular.module('singleConceptAuthoringApp').directive('conceptEdit', function ($rootScope, $timeout, $modal, $q, $interval, scaService, snowowlService, validationService, inactivationService, componentAuthoringUtil, notificationService, $routeParams, metadataService, crsService, languageService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        // the concept being displayed (required)
        concept: '=',

        // the branch of the concept (required)
        branch: '=',

        // the parent branch of the concept (not required)
        parentBranch: '=?',

        // whether to display as static (not editable) (not required)
        static: '=?',

        // whether this display is part of the merge view, triggers display
        // changes TODO These parameters are getting ridiculous, need to clean
        // this up
        merge: '@?',

        inactivationEditing: '@?',

        // parent function to invoke updating the ui state for this concept's
        // list (not required)
        uiStateUpdateFn: '&?',

        //Whether or not autosave should be enabled (not required)
        autosave: '@?',

        // styling for concept elements, as array [id0 : {message, style,
        // fields : {field0 : {message, style}, field1 : {...}}, id1 : ....]
        componentStyles: '=',

        // Any additional fields you would like adding to the concept model (not
        // required) e.g. All fields are added as text fields to the form and if
        // fields are specified then concept cleanup is disabled {
//            concept: ["notes"],
//            description: ["reasonForChange", "justificationForChange"],
//            relationship: ["reasonForChange", "justificationForChange"]
//        }
        additionalFields: '=?',

        // a function specified to save the concept with, if any
        saveFunction: '&?',

        // whether to initially display inactive descriptions and relationships
        showInactive: '@?'
      },
      templateUrl: 'shared/concept-edit/conceptEdit.html',

      link: function (scope, element, attrs, linkCtrl) //noinspection UnreachableCodeJS
      {

        scope.$watch(function () {
          return $rootScope.branchLocked;
        }, function () {

          if ($rootScope.branchLocked) {
            scope.isStatic = true;
          }

        }, true);
        scope.saving = false;
        if (!scope.concept) {
          console.error('Concept not specified for concept-edit');
          return;
        }

        if (!scope.branch) {
          console.error('Branch not specified for concept-edit');
          return;
        }


        //////////////////////////////////////////////////////////////
        // Convert all string booleans into scope boolean values
        /////////////////////////////////////////////////////////////

        if (scope.static === 'true' || scope.static === true) {
          scope.isStatic = true;
        } else {
          scope.isStatic = false;
        }

        if (scope.autosave === 'false' || scope.autosave === false) {
          scope.autosave = false;
        } else {
          scope.autosave = true;
        }

        if (scope.merge === 'true' || scope.merge === true) {
          scope.isMerge = true;
        } else {
          scope.isMerge = false;
        }

        if (scope.inactivationEditing === 'true' || scope.merge === true) {
          scope.isInactivation = true;
        } else {
          scope.isInactivation = false;
        }

        if (scope.showInactive === 'true' || scope.showInactive === true) {
          scope.hideInactive = false;
        } else {
          scope.hideInactive = true;
        }


        //
        // CRS concept initialization
        //
        if (crsService.isCrsConcept(scope.concept.conceptId)) {


          scope.hideInactive = false;

          var crsContainer = crsService.getCrsConcept(scope.concept.conceptId);

          scope.isModified = !crsContainer.saved;
        }

        //////////////////////////////////////////////////////////////
        // Handle additional fields, if required
        /////////////////////////////////////////////////////////////

        if (angular.isDefined(scope.additionalFields)) {
          scope.additionalFieldsDeclared = true;
        } else {
          scope.additionalFieldsDeclared = false;
        }
        scope.addAdditionalFields = function (concept) {
          if (scope.additionalFieldsDeclared === true) {
            if (scope.additionalFields.concept.length > 0) {
              angular.forEach(scope.additionalFields.concept, function (field) {
                concept.additionalFields = [];
                concept.additionalFields.push({field: ''});
              });
            }
            if (scope.additionalFields.relationship.length > 0) {
              angular.forEach(concept.relationships, function (relationship) {
                relationship.additionalFields = [];
              });
              angular.forEach(scope.additionalFields.relationship, function (field) {
                angular.forEach(concept.relationships, function (relationship) {
                  relationship.additionalFields.push({field: ''});
                });
              });
            }
            if (scope.additionalFields.description.length > 0) {
              angular.forEach(concept.descriptions, function (description) {
                description.additionalFields = [];
              });
              angular.forEach(scope.additionalFields.description, function (field) {
                angular.forEach(concept.descriptions, function (description) {
                  description.additionalFields.push({field: ''});
                });
              });
            }
            return concept;
          }
          else {
            return concept;
          }
        };

        //
        // Extension handling
        // TODO Move relevant content here
        //
        scope.isLockedModule = metadataService.isLockedModule;
        scope.isExtensionDialect = metadataService.isExtensionDialect;
        /////////////////////////////////////////////////////////////////
        // Autosaving and Modified Concept Storage Initialization
        /////////////////////////////////////////////////////////////////

        // initialize the last saved version of this concept
        scope.unmodifiedConcept = JSON.parse(JSON.stringify(scope.concept));
        scope.unmodifiedConcept = scope.addAdditionalFields(scope.unmodifiedConcept);
        if (scope.autosave === false) {
          scope.concept = scope.unmodifiedConcept;
        }

        // on load, check if a modified, unsaved version of this concept
        // exists -- only applies to task level, safety check
        if ($routeParams.taskKey && scope.autosave === true) {

          scaService.getModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId).then(function (modifiedConcept) {


            // if not an empty JSON object, process the modified version
            if (modifiedConcept) {

              // replace the displayed content with the modified concept
              scope.concept = modifiedConcept;

              sortDescriptions();
              sortRelationships();

              // reset the concept history to reflect modified change
              resetConceptHistory();

              // set scope flag
              scope.isModified = true;

              scope.computeRelationshipGroups();
            }

            // special case for unsaved concepts to catch possible bugs
            else {
              // if unsaved, and no modified data found, simply replace with
              // blank concept
              if (scope.concept.conceptId === 'unsaved') {
                scope.concept = componentAuthoringUtil.getNewConcept(scope.branch);
              }

              // if an actual unsaved concept (no fsn assigned), mark as
              // modified
              if (!scope.concept.fsn) {
                scope.isModified = true;
              }
            }
          });
        }


        scope.collapse = function (concept) {
          if (scope.isCollapsed === true) {
            scope.isCollapsed = false;

            // id required, used in drawModel.js
            $('#image-' + concept.conceptId).css('display', 'inline-block');
          }
          else {
            scope.isCollapsed = true;

            // id required, used in drawModel.js
            $('#image-' + concept.conceptId).css('display', 'none');
          }

        };

        // allowable attributes for relationships
        scope.allowedAttributes = [];

        scope.toggleHideInactive = function () {
          scope.hideInactive = !scope.hideInactive;
        };

        ////////////////////////////////
        // Concept Elements
        ////////////////////////////////

        // define characteristic types
        scope.definitionStatuses = [
          {id: 'PRIMITIVE', name: 'P'},
          {id: 'FULLY_DEFINED', name: 'FD'}
        ];

        // Retrieve inactivation reasons from metadata service
        var inactivateConceptReasons = metadataService.getConceptInactivationReasons();
        var inactivateAssociationReasons = metadataService.getAssociationInactivationReasons();
        var inactivateDescriptionReasons = metadataService.getDescriptionInactivationReasons();

        scope.removeConcept = function (concept) {
          $rootScope.$broadcast('stopEditing', {concept: concept});
        };

        ///////////////////////////////////////////////
        // Validation and saving
        ///////////////////////////////////////////////


        // function to validate concept and display any errors or warnings
        scope.validateConcept = function () {
          var deferred = $q.defer();

          snowowlService.validateConcept($routeParams.projectKey, $routeParams.taskKey, scope.concept).then(function (validationResults) {

            var results = {
              hasWarnings: false,
              hasErrors: false,
              warnings: {},
              errors: {}
            };

            angular.forEach(validationResults, function (validationResult) {
              if (validationResult.severity === 'WARNING') {
                if (!scope.merge) {
                  results.hasWarnings = true;
                  if (!results.warnings[validationResult.componentId]) {
                    results.warnings[validationResult.componentId] = [];
                  }
                  results.warnings[validationResult.componentId].push(validationResult.message);
                }
              }
              else if (validationResult.severity === 'ERROR') {
                results.hasErrors = true;
                if (!results.errors[validationResult.componentId]) {
                  results.errors[validationResult.componentId] = [];
                }
                results.errors[validationResult.componentId].push(validationResult.message);
              }
            });

            scope.validation = results;
            console.debug('in validate concept', scope.validation);
            deferred.resolve(results);
          }, function (error) {
            notificationService.sendError('Unexpected error validating concept prior to save');
            scope.validation = {};
            deferred.reject();
          });

          return deferred.promise;
        };

        // on load, check for the requiresValidation flag applied in saveHelper
        if (scope.concept.requiresValidation) {
          delete scope.concept.requiresValidation;
          scope.validateConcept();
        }


        /**
         * Helper function to save or update concept after validation
         * @param concept
         */
        function saveHelper() {


          // simple promise with resolve/reject on success/failure
          var deferred = $q.defer();


          // special case:  if merge view, broadcast and return no promise
          // TODO Should catch this with a 'when' in saveConcept functions
          if (scope.isMerge) {
            $rootScope.$broadcast('acceptMerge', {concept: scope.concept});
            deferred.reject(); // don't want validation run
          }

          else if (scope.isInactivation) {
            deferred.resolve(); // do want validation run
          }

          else {

            // store the concept id (may be blank or UUID/GUID)
            // NOTE: Needed for CRS integration
            var originalConceptId = scope.concept.conceptId;

            // clean the concept for snowowl-ready save
            snowowlService.cleanConcept(scope.concept);


            var saveFn = null;

            if (!scope.concept.conceptId || crsService.requiresCreation(scope.concept.conceptId)) {
              saveFn = snowowlService.createConcept;
            } else {
              saveFn = snowowlService.updateConcept;
            }


            saveFn(
              $routeParams.projectKey,
              $routeParams.taskKey,
              scope.concept
            ).then(function (response) {
                // successful response will have conceptId
                if (response && response.conceptId) {

                  // if was created, add a requiresValidation flag for re-render triggering
                  // NOTE: Still unsure exactly why create is triggering a full re-render
                  // does not appear to be trackBy or similar issue in ng-repeat....
                  if (saveFn == snowowlService.createConcept) {
                    response.requiresValidation = true;
                  }

                  // set concept and unmodified state
                  scope.concept = response;
                  scope.unmodifiedConcept = JSON.parse(JSON.stringify(response));
                  scope.unmodifiedConcept = scope.addAdditionalFields(scope.unmodifiedConcept);
                  scope.isModified = false;

                  // add isCreated

                  // all concept updates should clear the validation failure exclusions
                  validationService.clearValidationFailureExclusionsForConceptId(scope.concept.conceptId);

                  // if a crs concept
                  if (crsService.isCrsConcept(originalConceptId)) {
                    var crsConcept = crsService.getCrsConcept(originalConceptId);

                    // if unsaved, update possible GUID and concept property changes in saved and favorite lists
                    if (!crsConcept.saved) {
                      $rootScope.$broadcast('saveCrsConcept', {concept: crsConcept, crsConceptId: originalConceptId});
                    }

                    // update the crs concept
                    crsService.saveCrsConcept(originalConceptId, scope.concept);
                  }

                  // clear the modified state if no id was specified
                  if (!originalConceptId || originalConceptId.indexOf('-') !== -1) {
                    scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, null);
                  } else {

                    // clear the saved modified state
                    scaService.saveModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId, null);
                  }

                  // ensure descriptions & relationships are sorted
                  sortDescriptions();
                  sortRelationships();

                  scope.computeRelationshipGroups();

                  // broadcast event to any listeners (currently task detail, crs concept list,
                  // conflict/feedback resolved lists)
                  $rootScope.$broadcast('conceptEdit.conceptChange', {
                    branch: scope.branch,
                    conceptId: scope.concept.conceptId,
                    concept: scope.concept
                  });

                  // if ui state update function specified, call it (after a
                  // moment to let binding update)
                  $timeout(function () {

                    if (scope.uiStateUpdateFn) {
                      scope.uiStateUpdateFn();
                    }
                  }, 3000);

                  deferred.resolve();
                }

                // handle error
                else {

                  deferred.reject(response.message);
                }
              },
              function (error) {
                deferred.reject(error);
              });
          }

          return deferred.promise;

        }


        scope.saveConcept = function () {

          console.debug('saveConcept');


          // clear the top level errors and warnings
          scope.errors = null;
          scope.warnings = null;

          // clear the component-level errors and warnings
          scope.validation = {
            'warnings': {},
            'errors': {}
          };

          // display error msg if concept not valid but no other
          // errors/warnings specified
          if (!scope.isConceptValid(scope.concept) && !scope.errors && !scope.warnings) {
            scope.errors = ['Concept is not complete, and cannot be saved.  Specify all empty fields and try again.'];
            return;
          }
          else if (!scope.isConceptValid(scope.concept) && scope.errors) {
            return;
          }

          // clean concept of any locally added information
          // store original concept id for CRS integration
          var originalConceptId = scope.concept.conceptId;
          snowowlService.cleanConcept(scope.concept);

          var saveMessage = scope.concept.conceptId ? 'Saving concept: ' + scope.concept.fsn : 'Saving new concept';
          scope.saving = true;

          // special case -- don't want save notifications in merge view, all
          // handling done in conflicts.js
          if (scope.merge) {
            notificationService.sendMessage('Saving accepted merged concept...');
          } else if (scope.isInactivation) {
            // do nothing
          } else {
            notificationService.sendMessage(saveMessage);
          }
          // validate concept first
          scope.validateConcept().then(function () {

            // special case -- merge:  display warnings and continue
            if (scope.merge) {
              $rootScope.$broadcast('acceptMerge', {
                concept: scope.concept,
                validationResults: scope.validation
              });
            }

            // special case -- inactivation:  simply broadcast concept
            else if (scope.isInactivation) {
              console.log('inactivation');

              if (scope.validation && scope.validation.hasErrors) {
                notificationService.sendError('Fix errors before continuing');
              } else {
                scope.saving = false;
                scope.isModified = false;
                $rootScope.$broadcast('saveInactivationEditing', {concept: scope.concept});
              }
            }

            // if errors, notify and do not save
            else if (scope.validation && scope.validation.hasErrors) {
              notificationService.sendError('Concept contains convention errors. Please resolve before saving.');
              scope.saving = false;
            }

            // if no errors but warnings, save, results will be displayed
            // after save NOTE: Do not notify or display until after save, as
            // component ids may change on return from term server
            else if (scope.validation && scope.validation.hasWarnings) {

              if (originalConceptId) {
                scope.concept.conceptId = originalConceptId;
              }

              // save concept
              saveHelper().then(function () {

                $timeout(function () {
                  // recompute validation warnings
                  scope.validateConcept().then(function (results) {
                    console.debug('validation after save helper', results);
                    notificationService.sendWarning('Concept saved, but contains convention warnings. Please review.');
                    scope.saving = false;
                  }, function (error) {
                    notificationService.sendError('Error: Concept saved with warnings, but could not retrieve convention validation warnings');
                    scope.saving = false;
                  });

                }, 1000)
              }, function (error) {
                if (error.status === 504) {
                  notificationService.sendWarning('Your save operation is taking longer than expected, but will complete. Please use search to verify that your concept has saved and then remove the unsaved version from the edit panel');
                }
                else {
                  notificationService.sendError('Error saving concept: ' + error.statusText);
                }
                scope.saving = false;
              });

            }


            // otherwise, just save
            else {


              if (originalConceptId) {
                scope.concept.conceptId = originalConceptId;
              }

              saveHelper(scope.concept).then(function () {
                scope.validateConcept();
                notificationService.sendMessage('Concept saved: ' + scope.concept.fsn, 5000);
                scope.saving = false;
              }, function (error) {
                console.log(error);
                if (error.status === 504) {
                  notificationService.sendWarning('Your save operation is taking longer than expected, but will complete. Please use search to verify that your concept has saved and then remove the unsaved version from the edit panel');
                }
                else {
                  notificationService.sendError('Error saving concept: ' + error.statusText);
                }
                scope.saving = false;
              });
            }

          }, function (error) {
            notificationService.sendError('Fatal error: Could not validate concept');
            scope.saving = false;
          });
        };

        // pass inactivation service function to determine whether in process of inactivation
        //scope.isInactivation = inactivationService.isInactivation;


        // function to toggle active status of concept
        // cascades to children components
        // NOTE: This function hard-saves the concept, to prevent sync errors
        // between inactivation reason persistence and concept state
        scope.toggleConceptActive = function (concept, deletion) {

          if (scope.isStatic) {
            return;
          }
          if (scope.isMerge) {
            notificationService.sendWarning('Concept and Description inactivation has been disabled during merge. In the case that you want to modify an activation status please accept the merge and then make these changes within the task.');
            return;
          }
          // if active, ensure concept is fully saved prior to inactivation
          // don't want to persist the inactivation reason without a forced
          // save
          if (false && scope.isModified) {
            window.alert('You must save your changes to the concept before ' + (scope.concept.active ? 'inactivation.' : 'reactivation.'));
            return;
          }
          // if inactive, simply set active and autoSave
          if (!scope.concept.active) {
            scope.warnings = ['Please select which relationships you would like to activate along with the concept, or create a new Is A and click save.'];
            if (!scope.concept.relationships) {

              scope.concept.relationships = [];
              scope.concept.relationships.push(componentAuthoringUtil.getNewIsaRelationship(null));
              autoSave();
              scope.computeRelationshipGroups();
            }
            else {
              var stated = false;
              angular.forEach(scope.concept.relationships, function (relationship) {
                if (relationship.characteristicType === 'STATED_RELATIONSHIP') {
                  stated = true;
                }
              });
              if (stated === false) {
                scope.concept.relationships.push(componentAuthoringUtil.getNewIsaRelationship(null));
                autoSave();
                scope.computeRelationshipGroups();
              }
            }
            scope.getDomainAttributes();
            scope.concept.active = true;
            scope.hideInactive = false;

            scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId);

          }

          // otherwise, proceed with checks and inactivation reason persistence
          else {
            if (deletion) {
              selectInactivationReason('Concept', inactivateConceptReasons, inactivateAssociationReasons, scope.concept.conceptId, scope.concept, scope.branch, deletion).then(function (results) {
                if (results.deletion && !results.associationTarget) {
                  notificationService.sendMessage('Deleting Concept...');
                  snowowlService.deleteConcept(scope.concept.conceptId, scope.branch).then(function (response) {
                    if (response.status === 409) {
                      notificationService.sendError('Cannot delete concept - One or more components is published', 5000);
                    }
                    else {
                      $rootScope.$broadcast('removeItem', {concept: scope.concept});
                      scope.removeConcept(scope.concept);

                      // remove from the modified list
                      scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId);

                      notificationService.sendMessage('Concept Deleted', 5000);
                    }
                  });
                }
                else {
                  inactivationService.setParameters(scope.branch, scope.concept, null, results.associationTarget, results.deletion);
                  $rootScope.$broadcast('conceptEdit.inactivateConcept');
                }
              });
            }
            else {
              // mimic actual inactivation
              var conceptCopy = angular.copy(scope.concept);
              conceptCopy.isLeafInferred = true;

              conceptCopy.active = false;
              angular.forEach(conceptCopy.relationships, function (relationship) {
                relationship.active = false;
              });

              // special case:  do not allow inactivation of fully defined
              // concepts
              if (scope.concept.definitionStatus === 'FULLY_DEFINED') {
                scope.errors = ['Convention Error: Cannot inactivate a fully defined concept; inactive concepts must be defined as primitive.'];
                return;
              }

              // validate the concept
              snowowlService.validateConcept($routeParams.projectKey, $routeParams.taskKey, conceptCopy).then(function (validationResults) {
                // check for errors -- NOTE: Currently unused, but errors are
                // printed to log if detected
                var errors = validationResults.filter(
                  function (result) {
                    return result.type === 'ERROR';
                  });

                if (errors.length > 0) {
                  console.log('Detected errors in concept when inactivating', errors);
                } else {
                  console.log('No errors detected');
                }

                selectInactivationReason('Concept', inactivateConceptReasons, inactivateAssociationReasons, scope.concept.conceptId, scope.concept, scope.branch).then(function (results) {

                  // set the concept in the inactivation service for listener update and retrieval
                  // NOTE: Also broadcasts a route change to edit.js from the service
                  inactivationService.setParameters(scope.branch, scope.concept, results.reason.id, results.associationTarget);
                  $rootScope.$broadcast('conceptEdit.inactivateConcept');


                });
              });
            }
          }

        };

        /**
         * Function to toggle the definition status of the displayed concept,
         * with autosave
         */
        scope.toggleConceptDefinitionStatus = function (isStatic) {
          if (!isStatic) {
            if (scope.concept.definitionStatus === 'FULLY_DEFINED') {
              scope.concept.definitionStatus = 'PRIMITIVE';
            }
            else {
              scope.concept.definitionStatus = 'FULLY_DEFINED';
            }
            // only action required is autosave, value is changed via select
            // (unlike toggle buttons)
            autoSave();
          }

        };

// function to apply cascade changes when concept module id changes
        scope.setConceptModule = function (concept) {
          angular.forEach(scope.concept.descriptions, function (description) {
            description.moduleId = concept.moduleId;
          });
          angular.forEach(scope.concept.relationships, function (relationship) {
            relationship.moduleId = concept.moduleId;
          });

          autoSave();
        };

        //
        // Component more functions
        //

        // get the avialable languages for this module id
        scope.getAvailableLanguages = function (moduleId) {

          return metadataService.getLanguagesForModuleId(moduleId);
        };

        // get the available modules based on whether this is an extension element
        scope.getAvailableModules = function (moduleId) {
          return metadataService.getModulesForModuleId(moduleId);

        };

////////////////////////////////
// Description Elements
////////////////////////////////

// Define definition types
// NOTE:  PT is not a SNOMEDCT type, used to set acceptabilities
        scope.descTypeIds = [
          {id: '900000000000003001', abbr: 'FSN', name: 'FSN'},
          {id: '900000000000013009', abbr: 'SYN', name: 'SYNONYM'},
          {id: '900000000000550004', abbr: 'DEF', name: 'TEXT_DEFINITION'}
        ];

        // define the available dialects
        scope.dialects = metadataService.getAllDialects();

        // always return en-us dialect first
        scope.dialectComparator = function (a, b) {
          if (a === '900000000000509007') {
            return -1;
          } else if (b === '900000000000509007') {
            return 1;
          } else {
            return a < b;
          }
        };

        // function to retrieve branch dialect ids as array instead of map
        // NOTE: Required for orderBy in ng-repeat
        scope.getDialectIdsForDescription = function (description, FSN) {
          return Object.keys(metadataService.getDialectsForModuleId(description.moduleId, FSN)).sort(scope.dialectComparator);
        };

        // define acceptability types
        scope.acceptabilityAbbrs = {
          'PREFERRED': 'P',
          'ACCEPTABLE': 'A'
        };

        scope.getExtensionMetadata = metadataService.getExtensionMetadata;

// Reorder descriptions based on type and acceptability
// Must preserve position of untyped/new descriptions
        function sortDescriptions() {


          if (!scope.concept.descriptions) {
            return;
          }

          var newArray = [];

          // get all typed descriptions
          angular.forEach(scope.concept.descriptions, function (description) {
            if (description.type) {
              newArray.push(description);
            }
          });

          // sort typed descriptions
          newArray.sort(function (a, b) {

            // active before inactive
            if (a.active === false && b.active === true) {
              return 1;
            }
            if (b.active === false && a.active === true) {
              return -1;
            }

            // sort based on type
            if (a.type !== b.type) {

              // check both provided
              if (!a.type && b.type) {
                return 1;
              }
              if (!b.type && a.type) {
                return -1;
              }

              // sort based on type (both provided)
              var descOrderMap = {
                'FSN': 0,
                'SYNONYM': 1,
                'TEXT_DEFINITION': 2
              };
              return descOrderMap[a.type] < descOrderMap[b.type] ? -1 : 1;
            }

            // sort on acceptability map existence
            if (a.acceptabilityMap && !b.acceptabilityMap) {
              return -1;
            }
            if (!b.acceptabilityMap && a.acceptabilityMap) {
              return 1;
            }

            // ensure en-us PREFERRED terms always on top
            var aHasUsP = a.acceptabilityMap ? a.acceptabilityMap['900000000000509007'] === 'PREFERRED' : false;
            var bHasUsP = b.acceptabilityMap ? b.acceptabilityMap['900000000000509007'] === 'PREFERRED' : false;

            if (aHasUsP && !bHasUsP) {
              return -1;
            }
            if (!aHasUsP && bHasUsP) {
              return 1;
            }

            /*
             // ensure non-en-US PREFERRED terms appear above non-PREFERRED terms
             var aHasOtherP = a.acceptabilityMap && Object.keys(a.acceptabilityMap).filter(function (dialect) {
             if (dialect !== '900000000000509007' && a.acceptabilityMap[dialect] === 'PREFERRED') {
             return true;
             }
             }).length > 0;
             var bHasOtherP = b.acceptabilityMap && Object.keys(b.acceptabilityMap).filter(function (dialect) {
             if (dialect !== '900000000000509007' && b.acceptabilityMap[dialect] === 'PREFERRED') {
             return true;
             }
             }).length > 0;


             if (aHasOtherP && !bHasOtherP) {
             return -1;
             }
             if (!aHasOtherP && bHasOtherP) {
             return 1;
             }*/

            // comparator function for sorting by acceptabilities within a specified dialect
            var acceptabilityComparator = function (descA, descB, dialect) {

              var aVal = descA.acceptabilityMap ? descA.acceptabilityMap[dialect] : null;
              var bVal = descB.acceptabilityMap ? descB.acceptabilityMap[dialect] : null;

              console.debug(aVal, bVal, descA.term, descB.term);


              if (aVal !== bVal) {
                if (aVal && !bVal) {
                  return -1;
                }
                if (!aVal && bVal) {
                  return 1;
                }
                // check for preferred first
                if (aVal === 'PREFERRED') {
                  return -1;
                }
                if (bVal === 'PREFERRED') {
                  return 1;
                }

                // check for acceptable next
                if (aVal === 'ACCEPTABLE') {
                  return -1;
                }
                if (bVal === 'ACCEPTABLE') {
                  return 1;
                }
              }
              return 0;
            };

            // sort within en-us value first
            var comp = acceptabilityComparator(a, b, '900000000000509007');
            if (comp !== 0) {
              return comp;
            }


            // sort within non en-us values second
            for (var dialect in scope.dialects) {
              // sort by extension value if present
              if (metadataService.isExtensionSet() && metadataService.isExtensionDialect(dialect)) {
                comp = acceptabilityComparator(a, b, dialect);
                if (comp !== 0) {
                  return comp;
                }
              }

              // otherwise, sort within whatever other non-en-US dialects are present in turn
              else if (dialect !== '900000000000509007') {

                comp = acceptabilityComparator(a, b, dialect);
                if (comp !== 0) {
                  return comp;
                }
              }
            }

            if (a.term && !b.term) {
              return -1;
            }
            if (!a.term && b.term) {
              return 1;
            }
            if (!a.term && !b.term) {
              return 0;
            }
            // all else being equal, sort on term (case insensitive)
            return a.term.toLowerCase() < b.term.toLowerCase() ? -1 : 1;
          });

          // cycle over original descriptions (backward) to reinsert non-typed
          // descriptions
          for (var i = 0; i < scope.concept.descriptions.length; i++) {
            if (!scope.concept.descriptions[i].type) {
              newArray.splice(i, 0, scope.concept.descriptions[i]);
            }
          }

          // replace descriptions
          scope.concept.descriptions = newArray;

          //
        }

        function sortRelationships() {

          if (!scope.concept || !scope.concept.relationships) {
            return;
          }

          var isaRels = scope.concept.relationships.filter(function (rel) {
            return rel.type.conceptId === '116680003';
          });

          var attrRels = scope.concept.relationships.filter(function (rel) {
            return rel.type.conceptId !== '116680003';
          });

          // NOTE: All isaRels should be group 0, but sort by group anyway
          isaRels.sort(function (a, b) {
            if (!a.groupId && b.groupId) {
              return -1;
            }
            if (!b.groupId && a.groupId) {
              return 1;
            }
            if (a.groupId === b.groupId) {
              return a.target.fsn > b.target.fsn;
            } else {
              return a.groupId - b.groupId;
            }
          });

          attrRels.sort(function (a, b) {
            if (!a.groupId && b.groupId) {
              return -1;
            }
            if (!b.groupId && a.groupId) {
              return 1;
            }
            if (a.groupId === b.groupId) {
              return a.target.fsn > b.target.fsn;
            } else {
              return a.groupId - b.groupId;
            }
          });

          scope.concept.relationships = isaRels.concat(attrRels);
        }

        // on load, sort descriptions && relationships
        sortDescriptions();
        sortRelationships();

        scope.setCaseSignificance = function (description, caseSignificance) {

          // if arguments not supplied or static element, do nothing
          if (!caseSignificance || !description || scope.isStatic) {
            return;
          }

          // if current case significance clicked, do nothing
          if (description.caseSignificance === caseSignificance) {
            return;
          }
          description.caseSignificance = caseSignificance;
          autoSave();
        };

        scope.getInitialSelectedDialect = function (description) {
          return description.acceptabilityMap.hasOwnProperty('900000000000508004') ? '900000000000508004' :
            (description.acceptabilityMap.hasOwnProperty('900000000000508004') ? '900000000000508004' : '');
        };

// List of acceptable reasons for inactivating a description
// TODO:  More metadata to be retrieved on init and stored
//        var inactivateDescriptionReasons = [
//
//          {id: '', text: 'No reason'},
//          {id: 'MOVED_ELSEWHERE', text: 'Concept moved elsewhere'},
//          {id: 'CONCEPT_NON_CURRENT', text: 'Concept not current'},
//          {id: 'DUPLICATE', text: 'Duplicate concept'},
//          {id: 'ERRONEOUS', text: 'Erroneous concept'},
//          {id: 'INAPPROPRIATE', text: 'Inappropriate concept'},
//          {id: 'LIMITED', text: 'Limited concept'},
//          {id: 'OUTDATED', text: 'Outdated concept'},
//          {id: 'PENDING_MOVE', text: 'Pending move'}
//
//        ];

        scope.isDescriptionViewable = function (description) {
          if (!description) {
            return false;
          }
          if (scope.hideInactive && description.active !== true) {
            return false;
          }

          if (metadataService.isExtensionSet()) {


            // if no acceptability map, display to allow setting values
            if (!description.acceptabilityMap || Object.keys(description.acceptabilityMap).length == 0) {
              return true;
            }

            // only display if en-us or extension dialect present
            for (var dialect in description.acceptabilityMap) {

              if (metadataService.isUsDialect(dialect)) {
                return true;
              }
              if (metadataService.isExtensionDialect(dialect)) {

                return true;
              }
            }
            return false;
          }
          return true;


        };


// Adds a description to the concept
// arg: afterIndex, integer, the index at which to add description
// after
        scope.addDescription = function (afterIndex) {


          var description = componentAuthoringUtil.getNewDescription(null);


          // if not specified, simply push the new description
          if (afterIndex === null || afterIndex === undefined) {
            scope.concept.descriptions.push(description);
            autoSave();
          }
          // if in range, add after the specified afterIndex
          else {
            scope.concept.descriptions.splice(afterIndex + 1, 0, description);
            autoSave();
          }

        };

        /**
         * Function to remove description
         * @param description the description to remove
         */
        scope.removeDescription = function (description) {
          var index = scope.concept.descriptions.indexOf(description);
          if (index !== -1) {
            scope.concept.descriptions.splice(index, 1);
            autoSave();
            if (scope.concept.descriptions.length === 0) {
              scope.addDescription(0);
            }
          } else {
            console.error('Error removing description; description not found');
          }
        };

        /**
         * Inactivates or reactivates a description
         * NOTE: Uses hard-save to prevent sync errors between inactivation
         * reason persistence and concept state
         * @param description
         */
        scope.toggleDescriptionActive = function (description) {

          if (scope.isMerge) {
            notificationService.sendWarning('Concept and Description inactivation has been disabled during merge. In the case that you want to modify an activation status please accept the merge and then make these changes within the task.');
            return;
          }
          // if inactive, simply set active
          if (!description.active) {
            description.active = true;
            description.effectiveTime = null;
            if (description.type === 'FSN') {
              description.acceptabilityMap = componentAuthoringUtil.getNewAcceptabilityMap(description.moduleId, 'PREFERRED');
            }
            autoSave();
          }

          // if an unpublished description, no reason required
          else if (!description.effectiveTime) {

            description.active = false;
            var activeFsn = [];
            for (var i = 0; i < scope.concept.descriptions.length; i++) {
              if (scope.concept.descriptions[i].type === 'FSN' && scope.concept.descriptions[i].active === true) {
                activeFsn.push(scope.concept.descriptions[i]);
              }
            }
            if (activeFsn.length !== 1) {
              scope.errors = ['Concept must have an active FSN. Please create a new FSN before inactivating the old one.'];
              description.active = true;
            }
            else {
              // ensure all minimum fields are present
              componentAuthoringUtil.applyMinimumFields(scope.concept);
              autoSave();
            }
          }

          // otherwise, open a select reason modal
          else {

            // temporarily inactivate the description to
            description.active = false;
            var innerActiveFsn = [];
            for (var j = 0; j < scope.concept.descriptions.length; j++) {
              if (scope.concept.descriptions[j].type === 'FSN' && scope.concept.descriptions[j].active === true) {
                innerActiveFsn.push(scope.concept.descriptions[j]);
              }
            }
            if (innerActiveFsn.length !== 1) {
              scope.errors = ['Concept must have an active FSN. Please create a new FSN before inactivating the old one.'];

              // reactivate the description, inactivation aborted
              description.active = true;
            }
            else {
              // reactivate the description before selecting a reason
              description.active = true;

              selectInactivationReason('Description', inactivateDescriptionReasons, null, null, null, null).then(function (results) {

                notificationService.sendMessage('Inactivating description (' + results.reason.text + ')');

                // if a reason supplied
                if (results.reason.id) {

                  // persist the inactivation reason
//                  snowowlService.inactivateDescription(scope.branch, description.descriptionId, results.reason.id).then(function (response) {
                  description.active = false;
                  description.inactivationIndicator = results.reason.id;
                  console.log(description.inactivationIndicator);
                  console.log(description);
                  scope.saveConcept();
//                  }, function (error) {
//                    notificationService.sendError('Error inactivating description');
//                  });

                }

                // if no reason supplied, simply save the concept
                else {
                  description.active = false;
                  scope.saveConcept();
                }
              });
            }
          }
        };
        scope.editDescriptionInactivationReason = function (item) {
          selectInactivationReason('Description', inactivateDescriptionReasons, null, null, null, null).then(function (results) {

            notificationService.sendMessage('Inactivating description (' + results.reason.text + ')');

            // if a reason supplied
            //if (results.reason.id) {

//            // persist the inactivation reason
//            snowowlService.inactivateDescription(scope.branch, item.descriptionId, results.reason.id).then(function (response) {
            item.active = false;
            item.inactivationIndicator = results.reason.id;
            scope.saveConcept();
//            }, function (error) {
//              notificationService.sendError('Error inactivating description');
//            });

            //}
          });
        };

        scope.editConceptInactivationReason = function (item) {
          selectInactivationReason('Concept', inactivateConceptReasons, inactivateAssociationReasons, scope.concept.conceptId, scope.concept, scope.branch).then(function (results) {

            notificationService.sendMessage('Inactivating concept (' + results.reason.text + ')');

            snowowlService.inactivateConcept(scope.branch, scope.concept.conceptId, results.reason.id, results.associationTarget).then(function () {

              // if reason is selected, deactivate all descriptions and
              // relationships
              if (results.reason) {
                scope.concept.inactivationIndicator = results.reason.id;
                scope.concept.associationTargets = results.associationTarget;
                // save concept but bypass validation checks
                saveHelper().then(function () {
                  notificationService.sendMessage('Concept inactivated');
                }, function (error) {
                  notificationService.sendError('Concept inactivation indicator persisted, but concept could not be saved');
                });
              }
            }, function () {
              notificationService.sendError('Could not save inactivation reason for concept, concept will remain active');
            });

          });
        };

/// define case significances
        scope.getCaseSignificanceDisplayText = function (description) {
          switch (description.caseSignificance) {
            case 'INITIAL_CHARACTER_CASE_INSENSITIVE':
              return 'cI';
            case 'CASE_INSENSITIVE':
              return 'ci';
            case 'ENTIRE_TERM_CASE_SENSITIVE':
              return 'CS';
            default:
              return '??';
          }
        };

// Three possible values, cycle through them on toggle
        scope.toggleCaseSignificance = function (description) {

          if (description.caseSignificance === 'CASE_INSENSITIVE') {
            description.caseSignificance = 'INITIAL_CHARACTER_CASE_INSENSITIVE';
          } else if (description.caseSignificance === 'INITIAL_CHARACTER_CASE_INSENSITIVE') {
            description.caseSignificance = 'ENTIRE_TERM_CASE_SENSITIVE';
          } else {
            description.caseSignificance = 'CASE_INSENSITIVE';
          }

          autoSave();
        };

        /*
         Function to cycle acceptability map for a description & dialect through acceptable values
         Preferred -> Acceptable -> Not Acceptable -> Preferred
         */
        scope.toggleAcceptability = function (description, dialectId) {

          if (!description.acceptabilityMap) {
            description.acceptabilityMap = {};
          }
          if (description.type !== 'TEXT_DEFINITION') {
            switch (description.acceptabilityMap[dialectId]) {

              // if preferred, switch to acceptable
              case 'PREFERRED':
                description.acceptabilityMap[dialectId] = 'ACCEPTABLE';
                autoSave()
                break;

              // if acceptable, switch to not acceptable (i.e. clear the dialect
              // key)
              case 'ACCEPTABLE':
                delete description.acceptabilityMap[dialectId];
                autoSave()
                break;

              // if neither of the above, or blank, set to preferred
              default:
                description.acceptabilityMap[dialectId] = 'PREFERRED';
                autoSave()
                break;
            }
          }
          else {
            switch (description.acceptabilityMap[dialectId]) {
              case 'PREFERRED':
                delete description.acceptabilityMap[dialectId];
                autoSave()
                break;

              // if neither of the above, or blank, set to preferred
              default:
                description.acceptabilityMap[dialectId] = 'PREFERRED';
                autoSave()
                break;
            }
          }

        };

        // returns the name of a dialect given its refset id
        function getShortDialectName(id) {
          if (!scope.dialects[id]) {
            return '??';
          }
          return scope.dialects[id].replace('en-', '');
        }

        scope.getAcceptabilityTooltipText = function (description, dialectId) {
          if (!description || !dialectId) {
            return null;
          }

          // if no acceptability map specified, return 'N' for Not Acceptable
          if (!description.acceptabilityMap || !description.acceptabilityMap[dialectId]) {
            return 'Not Acceptable';
          }

          return description.acceptabilityMap[dialectId] === 'PREFERRED' ? 'Preferred' : 'Acceptable';
        };

        // returns the display abbreviation for a specified dialect
        scope.getAcceptabilityDisplayText = function (description, dialectId) {
          if (!description || !dialectId) {
            return null;
          }

          // if no acceptability map specified, return 'N' for Not Acceptable
          if (!description.acceptabilityMap) {
            return getShortDialectName(dialectId) + ':N';
          }

          // retrieve the value (or null if does not exist) and return
          var acceptability = description.acceptabilityMap[dialectId];

          // return the specified abbreviation, or 'N' for Not Acceptable if no
          // abbreviation found
          var displayText = scope.acceptabilityAbbrs[acceptability];
          return getShortDialectName(dialectId) + ':' + (displayText ? displayText : 'N');

          //return scope.acceptabilityAbbrs[acceptability];
        };


        ////////////////////////////////
        // Relationship Elements
        ////////////////////////////////

        scope.relationshipGroups = {};

        scope.filterRelationships = function (rel) {
          return !scope.hideInactive || rel.active;
        };

        scope.showRelationshipGroup = function (relGroup) {

          if (!scope.hideInactive) {
            return true;
          }
          var activeRels = relGroup.filter(function (item) {
            return item.active;
          });
          return activeRels.length > 0;
        };

        // function compute the relationship groups
        scope.computeRelationshipGroups = function () {

          // sort relationships to ensure proper sorting
          // sortRelationships();

          // clear the relationship groups
          scope.relationshipGroups = {};

          angular.forEach(scope.concept.relationships, function (rel) {

            // only show stated relationships
            if (rel.characteristicType === 'STATED_RELATIONSHIP') {

              // if map does not have this group id, add blank array
              if (!scope.relationshipGroups.hasOwnProperty(parseInt(rel.groupId))) {
                scope.relationshipGroups[parseInt(rel.groupId)] = [];
              }

              // push this relationship onto group-mapped array
              scope.relationshipGroups[parseInt(rel.groupId)].push(rel);
            }
          });
        };

// define characteristic types
        scope.characteristicTypes = [
          {id: 'STATED_RELATIONSHIP', abbr: 'Stated'},
          {id: 'INFERRED_RELATIONSHIP', abbr: 'Inferred'}
        ];

        scope.addRelationship = function (relGroup, relationshipBefore) {

          var relationship = componentAuthoringUtil.getNewAttributeRelationship(null);

          // set role group if specified
          if (relGroup) {
            relationship.groupId = relGroup;

          }
          var index = scope.concept.relationships.indexOf(relationshipBefore);
          if (index === -1) {
            scope.concept.relationships.push(relationship);
          } else {
            scope.concept.relationships.splice(index + 1, 0, relationship);
          }

          // autosave
          autoSave();

          // recompute the relationship groups
          scope.computeRelationshipGroups();
        };

        scope.removeRelationship = function (relationship) {
          var index = scope.concept.relationships.indexOf(relationship);
          if (index !== -1) {
            scope.concept.relationships.splice(index, 1);
            autoSave();
            if (scope.concept.relationships.length === 0) {
              scope.addIsaRelationship(0);
            }
          } else {
            console.error('Error removing relationship; relationship not found');
          }
          scope.computeRelationshipGroups();

        };

        scope.toggleRelationshipActive = function (relationship) {
          // no special handling required, simply toggle
          if (scope.concept.active === true) {
            relationship.active = !relationship.active;
            relationship.effectiveTime = null;
            componentAuthoringUtil.applyMinimumFields(scope.concept);
            scope.getDomainAttributes();
            autoSave();
          }
          else {
            scope.warnings = ['You must activate the concept before its components.'];
          }
        };

        scope.getConceptsForTypeahead = function (searchStr) {
          return snowowlService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, searchStr, 0, 20, null).then(function (response) {

            // remove duplicates
            for (var i = 0; i < response.length; i++) {
              for (var j = response.length - 1; j > i; j--) {
                if (response[j].concept.conceptId === response[i].concept.conceptId) {
                  response.splice(j, 1);
                  j--;
                }
              }
            }

            return response;
          });
        };

        /**
         * Sets relationship type concept based on typeahead selection
         * @param relationshipField the type or target JSON object
         * @param conceptId the concept id
         * @param fsn the fsn
         */
        scope.setRelationshipTypeConcept = function (relationship, item) {
          if (!relationship || !item) {
            console.error('Cannot set relationship concept field, either field or item not specified');
          }

          relationship.type.conceptId = item.concept.conceptId;
          relationship.type.fsn = item.concept.fsn;

          scope.updateRelationship(relationship, false);
        };

        /**
         * Sets relationship target concept based on typeahead selection
         * @param relationshipField the type or target JSON object
         * @param conceptId the concept id
         * @param fsn the fsn
         */
        scope.setRelationshipTargetConcept = function (relationship, item) {
          if (!relationship || !item) {
            console.error('Cannot set relationship concept field, either field or item not specified');
          }

          relationship.target.conceptId = item.concept.conceptId;
          relationship.target.fsn = item.concept.fsn;

          scope.updateRelationship(relationship, false);
        };

////////////////////////////////
// Shared Elements
////////////////////////////////

// deactivation modal for reason s elect
        var selectInactivationReason = function (componentType, reasons, associationTargets, conceptId, concept, branch, deletion) {

          var popups = document.querySelectorAll('.popover');
          if (popups) {
            for (var i = 0; i < popups.length; i++) {
              var popup = popups[i];
              var popupElement = angular.element(popup);
              popupElement.scope().$parent.isOpen = false;
              popupElement.remove();
            }
          }
          var deferred = $q.defer();

          var modalInstance = $modal.open({
            templateUrl: 'shared/inactivate-component-modal/inactivateComponentModal.html',
            controller: 'inactivateComponentModalCtrl',
            resolve: {
              componentType: function () {
                return componentType;
              },
              reasons: function () {
                return reasons;
              },
              associationTargets: function () {
                return associationTargets ? associationTargets : [];
              },
              conceptId: function () {
                return conceptId;
              },
              concept: function () {
                return concept;
              },
              branch: function () {
                return branch;
              },
              deletion: function () {
                return deletion;
              }
            }
          });

          modalInstance.result.then(function (results) {

            deferred.resolve(results);
          }, function () {
            deferred.reject();
          });

          return deferred.promise;
        };

////////////////////////////////////
// Drag and drop functions
////////////////////////////////////

// construct an id-name pair json object
        scope.getConceptIdNamePair = function (concept) {
          return {
            id: concept.conceptId,
            name: concept.fsn
          };
        };

// construct an id-name pair json object from relationship target
        scope.getConceptIdNamePairFromRelationshipTarget = function (relationship) {
          return {
            id: relationship.target.conceptId,
            name: relationship.target.fsn
          };
        };

// construct an id-name pair json object from attribute type
        scope.getConceptIdNamePairFromAttributeType = function (relationship) {
          return {
            id: relationship.type.conceptId,
            name: relationship.type.fsn
          };
        };

        scope.dropRelationshipTarget = function (relationship, data) {

          // cancel if static
          if (scope.isStatic) {
            return;
          }

          // check if modifications can be made (via effectiveTime)
          if (relationship.effectiveTime) {
            console.error('Cannot update released relationship');
            return;
          }

          if (!relationship) {
            console.error('Attempted to set target on null relationship');
          }
          if (!data || !data.id) {
            console.error('Attempted to set target on relationship from null data');
          }

          if (!data.name) {
            console.error('Attempted to set target on relationship without specifying name');
          }

          var tempFsn = relationship.target.fsn;

          relationship.target.fsn = 'Validating...';

          if (relationship.type.conceptId !== null) {
            // check if allowable relationship target using concept id
            scope.getConceptForValueTypeahead(relationship.type.conceptId, data.id).then(function (response) {
              if ((response && response.length > 0) || !metadataService.isMrcmEnabled()) {
                relationship.target.conceptId = data.id;
                relationship.target.fsn = data.name;
                scope.warnings = null;
                scope.updateRelationship(relationship, false);
              }

              // notify user of inappropriate relationship target by MRCM
              // rules
              else {
                scope.warnings = ['MRCM validation error: ' + data.name + ' is not a valid target concept.'];
                relationship.target.fsn = tempFsn;
              }

            });
          }
          else {
            relationship.target.conceptId = data.id;
            relationship.target.fsn = data.name;
            scope.warnings = null;
            scope.updateRelationship(relationship, false);
          }
        };

        scope.dropRelationshipType = function (relationship, data) {

          // cancel if static
          if (scope.isStatic) {
            return;
          }

          // check if modifications can be made (via effectiveTime)
          if (relationship.effectiveTime) {
            console.error('Cannot update released relationship');
            return;
          }

          if (!relationship) {
            console.error('Attempted to set type on null attribute');
          }
          if (!data || !data.id) {
            console.error('Attempted to set type on attribute from null data');
          }
          if (!data.name) {
            console.error('Attempted to set type on attribute without name specified');
          }

          // check that attribute is acceptable for MRCM rules
          var attributes = scope.getConceptForFullAttribute(data.id);
          if ((attributes && attributes.length > 0) || !metadataService.isMrcmEnabled()) {
            relationship.type.conceptId = data.id;
            relationship.type.fsn = data.name;
            scope.warnings = null;
            scope.updateRelationship(relationship, false);
          }

          // notify user of rules violation
          else {
            scope.warnings = ['MRCM validation error: ' + data.name + ' is not a valid attribute.'];
          }
        };

        /**
         * Function called when dropping a description on another
         * description
         * @param target the description dropped on
         * @param source the dragged description
         */
        scope.dropDescription = function (target, source) {

          // check arguments
          if (!target || !source) {
            console.error('Cannot drop description, either source or target not specified');
            return;
          }

          // copy description object and replace target description
          var copy = angular.copy(source);

          // clear the effective time
          copy.effectiveTime = null;
          copy.descriptionId = null;
          copy.conceptId = null; // re-added by snowowl

          var targetIndex = scope.concept.descriptions.indexOf(target);
          if (targetIndex === -1) {
            console.error('Unexpected error dropping description; cannot find target');
            return;
          }

          // if target not blank, add afterward
          if (target.term) {
            scope.concept.descriptions.splice(targetIndex + 1, 0, copy);
          }

          // otherwise find the matching description and replace
          else {
            scope.concept.descriptions[targetIndex] = copy;
          }

          autoSave();
        };

        /**
         * Function called when dropping a relationship on another
         * relationship Appends (clones) dropped relationship after the
         * target
         * @param target the relationship dropped on
         * @param source the dragged relationship
         */
        scope.dropRelationship = function (target, source) {

          if (!target || !source) {
            console.error('Cannot drop relationship, either source or target not specified');
            return;
          }

          if (source.relationshipId === target.relationshipId && source.type.conceptId === target.type.conceptId && source.target.conceptId === target.target.conceptId) {
            return;
          }

          // check if target is static
          if (scope.isStatic) {
            console.error('Scope is static, cannot drop');
            return;
          }

          scope.validateMrcmRulesForTypeAndValue(source.type.conceptId, source.type.fsn, source.target.fsn).then(function (response) {
            if (response.length === 0) {
              // copy relationship object and replace target relationship
              var copy = angular.copy(source);

              // clear the effective time and source information
              delete copy.sourceId;
              delete copy.effectiveTime;
              delete copy.relationshipId;

              // set the group based on target
              copy.groupId = target.groupId;

              // get index of target relationship
              var targetIndex = scope.concept.relationships.indexOf(target);

              // if existing relationship, insert source relationship afterwards
              if (target.target.conceptId) {
                scope.concept.relationships.splice(targetIndex + 1, 0, copy);
              }

              // otherwise replace the relationship
              else {
                scope.concept.relationships[targetIndex] = copy;
              }
              scope.getDomainAttributes();
              autoSave();

              scope.computeRelationshipGroups();

            } else {
              scope.warnings = response;
              scope.warnings.splice(0, 0, 'Could not drop relationship:');
            }
          });


        };

        scope.addRelationshipGroup = function () {

          var groupIds = scope.concept.relationships.map(function (rel) {
            return parseInt(rel.groupId);
          });

          // push two new relationships
          var rel = componentAuthoringUtil.getNewAttributeRelationship();
          rel.groupId = Math.max.apply(null, groupIds) + 1;
          scope.concept.relationships.push(rel);
          scope.concept.relationships.push(angular.copy(rel));

          // recompute relationship groups
          scope.computeRelationshipGroups();
        };

        scope.dropRelationshipGroup = function (relGroup) {

          //      console.debug('dropped relationship group', relGroup);

          if (!relGroup || relGroup.length === 0) {
            return;
          }

          if (scope.isStatic) {
            return;
          }

          scope.validateMrcmRulesForRelationshipGroup(relGroup).then(function (response) {

            // if no validation errors, continue
            if (response.length === 0) {

              // get the max group id and increment by one (or set to zero if no
              // groups defined)
              var maxGroup = -1;
              angular.forEach(scope.concept.relationships, function (rel) {
                if (parseInt(rel.groupId) > maxGroup) {
                  maxGroup = parseInt(rel.groupId);
                }
              });
              var newGroupId = maxGroup + 1;

              // strip identifying information from each relationship and push
              // to relationships with new group id
              angular.forEach(relGroup, function (rel) {
                if (rel.active === true) {
                  var copy = angular.copy(rel);

                  // set the group id based on whether it is an isa relationship
                  if (metadataService.isIsaRelationship(copy.type.conceptId)) {
                    copy.groupId = 0;
                  } else {
                    copy.groupId = newGroupId;
                  }

                  // clear the effective time and source information
                  delete copy.sourceId;
                  delete copy.effectiveTime;
                  delete copy.relationshipId;
                  delete copy.released;

                  // push to relationships
                  scope.concept.relationships.push(copy);
                }
              });

              // recompute the relationship groups
              scope.computeRelationshipGroups();

              autoSave();
            } else {
              scope.warnings = response;
              scope.warnings.splice(0, 0, 'Could not drop role group:');
            }
          }, function (error) {
            scope.warnings = ['Could not drop relationship group:  unexpected error validating type/value pairs'];
          });
        };

        scope.validateMrcmRulesForRelationshipGroup = function (relGroup) {
          var deferred = $q.defer();

          var errors = [];
          var relsChecked = 0;

          angular.forEach(relGroup, function (rel) {
            scope.validateMrcmRulesForTypeAndValue(rel.type.conceptId, rel.type.fsn, rel.target.fsn).then(function (response) {
              errors = errors.concat(response);
              if (++relsChecked === relGroup.length) {
                deferred.resolve(errors);
              }
            }, function (error) {
              deferred.reject('Could not validate type and value pairs');
            });
          });

          return deferred.promise;
        };

        /**
         * Function taking names of concepts and determining if they are valid
         * as type/value
         * @param type
         * @param value
         */
        scope.validateMrcmRulesForTypeAndValue = function (type, typeName, value) {
          var deferred = $q.defer();

          var errors = [];
          // check type (if not blank)
          if (type) {

            if (scope.getConceptForFullAttribute(typeName).length === 0) {
              errors.push('Attribute type ' + typeName + ' is disallowed.');
              deferred.resolve(errors);
            } else {
              // check target (if not blank)
              if (value) {
                scope.getConceptsForValueTypeahead(type, value).then(function (response) {
                  if (response.length === 0) {
                    errors.push('Attribute value ' + value + ' is disallowed for attribute type ' + type + '.');
                  }
                  deferred.resolve(errors);
                });
              } else {
                deferred.resolve(errors);
              }
            }
          } else {
            deferred.resolve(errors);
          }

          return deferred.promise;
        };

        scope.getDragImageForConcept = function (fsn) {
          return fsn;
        };

        scope.getDragImageForRelationship = function (relationship) {
          return relationship.groupId + ', ' + relationship.type.fsn + ' -> ' + relationship.target.fsn;
        };

        scope.getDragImageForDescription = function (description) {
          return description.term;
        };

        scope.getDragImageForRelationshipGroup = function (relationshipGroup) {
          return 'Relationship Group ' + relationshipGroup[0].groupId;
        };

// dummy function added for now to prevent default behavior
// of dropping into untagged input boxes.  Issue has been raised
// with the repository developers, but not up to forking and fixing
// on my own right now -- too much to do! (PWG, 7/10/2015)
        scope.dropNullOp = function () {
          return null;
        };

///////////////////////////////////////////////
// Component property retrieval (Inactivation)
///////////////////////////////////////////////)

        var conceptFsns = {};
        scope.getFsn = function (conceptId) {
          if (conceptFsns.hasOwnProperty(conceptId)) {
            return conceptFsns[conceptId];
          } else {
            conceptFsns[conceptId] = 'Retrieving FSN...';
            snowowlService.getFullConcept(conceptId, scope.branch).then(function (response) {
              conceptFsns[conceptId] = response.fsn;
            });

          }
        };

        /**
         * Sets needed concept properties as element attributes
         * @param concept
         */
        scope.setConceptProperties = function (concept, $event) {
          if (!concept) {
            return;
          }
          scope.setPopoverDirection($event);
        };

        /**
         * Sets needed description properties as element attributes
         * @param description
         */
        scope.setDescriptionProperties = function (description, $event) {
          if (!description) {
            return;
          }
          scope.setPopoverDirection($event);
        };

        /**
         * Sets needed relationship properties as element attributes
         * @param relationship
         */
        scope.setRelationshipProperties = function (relationship, $event) {
          if (!relationship) {
            return;
          }
          scope.setPopoverDirection($event);
        };

// NOTE: No inactivation reasons currently for relationships

///////////////////////////////////////////////
// Concept Auto-Saving Validation Checks
///////////////////////////////////////////////

// method to check single description for validity
        scope.isDescriptionValid = function (description) {

          // if not published and inactive, consider valid (removed by
          // saveConcept)
          if (!description.active && !description.effectiveTime) {
            return true;
          }

          if (!description.moduleId) {
            console.error('description must have moduleId', description);
            // specified';
            return false;
          }
          if (!description.term) {
            console.error('Description must have term specified', description);
            return false;
          }
          if (description.active === null) {
            console.error('Description active flag must be set', description);
            return false;
          }
          if (!description.lang) {
            console.error('Description lang must be set', description);
            return false;
          }
          if (!description.caseSignificance) {
            console.error('Description case significance must be set', description);
            return false;
          }
          if (!description.type) {
            console.error('Description type must be set', description);
            return false;
          }

          if (description.active && (!description.acceptabilityMap || Object.keys(description.acceptabilityMap).length == 0)) {
            console.error('Description acceptability map cannot be empty');
            return false;
          }

          // pass all checks -> return true
          return true;
        };

// method to check single relationship for validity
        scope.isRelationshipValid = function (relationship) {

          // if not active and no effective time, consider valid (removed by
          // saveConcept)
          if (!relationship.active && !relationship.effectiveTime) {
            return true;
          }

          // check relationship fields
          if (!relationship.modifier) {
            //relationship.error = 'Relationship modifier must be set';
            return false;
          }
          if (relationship.groupId === null) {
            //relationship.error = 'Relationship groupId must be set';
            return false;
          }
          if (!relationship.moduleId) {
            //relationship.error = 'Relationship moduleId must be set';
            return false;
          }
          if (relationship.active === null) {
            // relationship.error = 'Relationship active flag must be set';
            return false;
          }
          if (!relationship.characteristicType) {
            //relationship.error = 'Relationship characteristic type must be
            // set';
            return false;
          }
          if (!relationship.type || !relationship.type.conceptId) {
            console.error('Relationship type must be set');
            return false;
          }
          if (!relationship.target || !relationship.target.conceptId) {
            console.error('Relationship target must be set');
            return false;
          }

          // verify that source id exists
          if (scope.concept.conceptId && !relationship.sourceId) {
            relationship.sourceId = scope.concept.conceptId;
          }

          delete relationship.error;
          // pass all checks -> return true
          return true;
        };

// function to check the full concept for validity before saving
        scope.isConceptValid = function (concept) {

          //  console.debug('Checking concept valid', concept);

          /*// check the basic concept fields
           if (concept.isLeafInferred === null) {
           console.error('Concept isleafInferred flag must be set');
           return false;
           }*/
          if (!concept.descriptions || concept.descriptions.length === 0) {
            console.error('Concept must have at least one description');
            return false;
          }
          if (!concept.relationships || concept.relationships.length === 0) {
            console.error('Concept must have at lalst one relationship');
            return false;
          }
          if (!concept.definitionStatus) {
            console.error('Concept definitionStatus must be set');
            return false;
          }
          if (concept.active === null) {
            console.error('Concept active flag must be set');
            return false;
          }
          if (!concept.moduleId) {
            console.error('Concept moduleId must be set');
            return false;
          }
          var activeFsn = [];
          for (var i = 0; i < concept.descriptions.length; i++) {
            if (concept.descriptions[i].type === 'FSN' && concept.descriptions[i].active === true) {
              activeFsn.push(concept.descriptions[i]);
            }
          }
          if (activeFsn.length !== 1) {
            scope.errors = ['Concept with id: ' + concept.conceptId + ' Must have exactly one active FSN. Concept not saved.'];
            return false;
          }

          // check descriptions
          for (var k = 0; k < concept.descriptions.length; k++) {
            if (!scope.isDescriptionValid(concept.descriptions[k])) {
              return false;
            }
          }

          // check relationships
          for (var j = 0; j < concept.relationships.length; j++) {
            if (!scope.isRelationshipValid(concept.relationships[j])) {
              return false;
            }
          }

          // pass all checks -> return true
          return true;

        };

// function to update description and autoSave if indicated
        scope.updateDescription = function (description) {
          if (!description) {
            return;
          }

          // if this is a new TEXT_DEFINITION, apply defaults
          // sensitivity is correctly set
          if (description.type === 'TEXT_DEFINITION' && !metadataService.isLockedModule(description.moduleId)) {
            angular.forEach(scope.getDialectIdsForDescription(description), function (dialectId) {
              description.acceptabilityMap[dialectId] = 'PREFERRED';
            });
            description.caseSignificance = 'ENTIRE_TERM_CASE_SENSITIVE';
          }

          // if a new description (determined by blank term), ensure sensitivity
          // do not modify acceptability map
          else if (!description.effectiveTime && description.type === 'SYNONYM' && !metadataService.isLockedModule(description.moduleId)) {
            description.caseSignificance = 'INITIAL_CHARACTER_CASE_INSENSITIVE';
          }

          // if this is the FSN, apply defaults (if new) and check if a
          // matching PT should be generated
          else if (description.type === 'FSN') {

            // if a new FSN (determined by no effective time)
            if (!description.effectiveTime && !metadataService.isLockedModule(description.moduleId)) {

              // strip any non-international dialects
              angular.forEach(Object.keys(description.acceptabilityMap), function (dialectId) {
                console.debug('checking2', dialectId);
                if (!metadataService.isUsDialect(dialectId) && !metadataService.isGbDialect(dialectId)) {
                  delete description.acceptabilityMap[dialectId];
                }
              });

              // ensure all dialects returned from metadata are preferred
              angular.forEach(scope.getDialectIdsForDescription(description, true), function (dialectId) {
                console.debug('checking', dialectId);
                description.acceptabilityMap[dialectId] = 'PREFERRED';

              });
              description.caseSignificance = 'INITIAL_CHARACTER_CASE_INSENSITIVE';
            }
          }

          // In order to ensure proper term-server behavior
          // if this description is unpublished, but has an SCTID
          // remove the id to allow proper deletion and update
          // Otherwise, changes 'revert' to previously saved values
          if (!description.effectiveTime) {
            delete description.descriptionId;
          }

          // run automations
          var conceptCopy = angular.copy(scope.concept);
          componentAuthoringUtil.runDescriptionAutomations(scope.concept, description).then(function (updatedConcept) {
            scope.concept = updatedConcept;
            autoSave();
          }, function (error) {
            notificationService.sendWarning('Automations failed: ' + error);
            autoSave();
          });


        };

// function to update relationship and autoSave if indicated
        scope.updateRelationship = function (relationship, roleGroupOnly) {
          scope.getDomainAttributes();
          if (!relationship) {
            return;
          }

          // if this relationship is unpublished, but has an SCTID
          // remove the id to allow proper deletion and update
          // Otherwise, changes 'revert' to previously saved values
          if (!relationship.effectiveTime && !roleGroupOnly) {
            delete relationship.relationshipId;
          }
          if (relationship.type.conceptId === '116680003' && !roleGroupOnly) {
            scope.getDomainAttributes();
          }

          scope.computeRelationshipGroups();

          autoSave(relationship);

        };

        scope.revertConcept = function () {
          if (!scope.parentBranch) {
            return;
          }

          notificationService.sendMessage('Reverting concept ' + scope.concept.fsn + ' to parent branch ' + scope.parentBranch, 0);

          snowowlService.getFullConcept(scope.concept.conceptId, scope.parentBranch).then(function (response) {
            scope.concept = response;
            sortDescriptions();
            sortRelationships();
            notificationService.clear();
            resetConceptHistory();
            scope.isModified = false;
          }, function (error) {
            notificationService.sendError('Error reverting: Could not retrieve concept ' + scope.concept.conceptId + ' from parent branch ' + scope.parentBranch);
          });

        };

/////////////////////////////
// Undo / Redo functions
/////////////////////////////

// concept history for undoing changes (init with passed concept)
        scope.conceptHistory = [JSON.parse(JSON.stringify(scope.concept))];

// concept history pointer (currently active state)
        scope.conceptHistoryPtr = 0;

        /**
         * Saves the current concept state for later retrieval
         * Called by autoSave(), undo(), redo()
         */
        function saveModifiedConcept() {

          scope.isModified = true;

          // broadcast event to any listeners (currently task detail)
          $rootScope.$broadcast('conceptEdit.conceptModified', {
            branch: scope.branch,
            conceptId: scope.concept.conceptId,
            concept: scope.concept
          });

          // if changed
          if (scope.concept !== scope.unmodifiedConcept) {

            // store the modified concept in ui-state if autosave on
            if (scope.autosave === true) {
              scaService.saveModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId, scope.concept);
            }

          }
        }

        /**
         * Autosaves the concept modifications and updates history
         * NOTE: outside $watch to prevent spurious updates
         */
        function autoSave() {

          scope.conceptHistory.push(JSON.parse(JSON.stringify(scope.concept)));
          scope.conceptHistoryPtr++;

          scope.isModified = true;
          if (scope.isInactivation) {
            if (scope.validation && scope.validation.hasErrors) {
              notificationService.sendError('Fix errors before continuing');
            } else {
              scope.saving = false;
              scope.isModified = false;
              $rootScope.$broadcast('saveInactivationEditing', {concept: scope.concept});
            }
          }

          // save the modified concept
          saveModifiedConcept();
        }


        /**
         * Resets concept history
         */
        function resetConceptHistory() {
          scope.conceptHistory = [JSON.parse(JSON.stringify(scope.concept))];
          scope.conceptHistoryPtr = 0;

          scope.computeRelationshipGroups();
        }

        /**
         * Undo:  Decrement history pointer and update display
         */
        scope.undo = function () {
          if (scope.conceptHistoryPtr > 0) {
            scope.conceptHistoryPtr--;
            scope.concept = scope.conceptHistory[scope.conceptHistoryPtr];
            saveModifiedConcept();

            scope.computeRelationshipGroups();
          }
        };

        /**
         * Redo:  Increment history pointer and update display
         */
        scope.redo = function () {
          if (scope.conceptHistoryPtr < scope.conceptHistory.length - 1) {
            scope.conceptHistoryPtr++;
            scope.concept = scope.conceptHistory[scope.conceptHistoryPtr];

            saveModifiedConcept();

            scope.computeRelationshipGroups();
          }
        };

        /**
         * Undo all:  Add original version to end of history and update
         * display
         */
        scope.undoAll = function () {

          // if no previously published state, get a new (blank) concept
          if (scope.concept.conceptId === 'unsaved' || !scope.concept.conceptId) {

            scope.concept = componentAuthoringUtil.getNewConcept(scope.branch);
            scope.unmodifiedConcept = JSON.parse(JSON.stringify(scope.concept));
            scope.isModified = false;
            scope.computeRelationshipGroups();

          } else {
            notificationService.sendMessage('Reverting concept...');
            snowowlService.getFullConcept(scope.concept.conceptId, scope.branch).then(function (response) {
              notificationService.sendMessage('Concept successfully reverted to saved version', 5000);

              // set concept to response
              scope.concept = response;

              // reset the modified concept variables and clear the ui-state
              scope.unmodifiedConcept = JSON.parse(JSON.stringify(response));
              scope.unmodifiedConcept = scope.addAdditionalFields(scope.unmodifiedConcept);
              scope.isModified = false;
              scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId);

              // sort components and calculate relationship gruops
              sortDescriptions();
              sortRelationships();
              scope.computeRelationshipGroups();
            }, function (error) {
              notificationService.sendMessage('Error reverting concept');
            });
          }
        };

//////////////////////////////////////////////
// MRCM functions
//////////////////////////////////////////////
        scope.getDomainAttributes = function () {
          var idList = '';
          angular.forEach(scope.concept.relationships, function (relationship) {
            // add to id list if: active, Is A relationship, target
            // specified, and not inferred
            if (relationship.active === true && relationship.type.conceptId === '116680003' && relationship.target.conceptId && relationship.characteristicType !== 'INFERRED_RELATIONSHIP') {

              idList += relationship.target.conceptId + ',';
            }
          });
          idList = idList.substring(0, idList.length - 1);

          snowowlService.getDomainAttributes(scope.branch, idList).then(function (response) {
            scope.allowedAttributes = response.items;
          });
        };

        scope.$watch(scope.concept.relationships, function (newValue, oldValue) {

          var changed = false;
          angular.forEach(scope.concept.relationships, function (relationship) {
            if (relationship.type.conceptId === '116680003' && relationship.active === true) {
              changed = true;
            }
          });

          // get the permissible domain attributes
          if (changed === true) {
            scope.getDomainAttributes();
          }

          // compute the role groups
          scope.computeRelationshipGroups();
        }, true);

        scope.getConceptsForAttributeTypeahead = function (searchStr) {
          var response = scope.allowedAttributes;
          for (var i = 0; i < response.length; i++) {
            for (var j = response.length - 1; j > i; j--) {
              if (response[j].id === response[i].id) {
                response.splice(j, 1);
                j--;
              }
            }
          }
          response = response.filter(function (item) {
            return item.fsn.term.toLowerCase().indexOf(searchStr.toLowerCase()) !== -1;
          });
          return response;
        };

        scope.getConceptForFullAttribute = function (searchStr) {
          var response = scope.allowedAttributes;
          for (var i = 0; i < response.length; i++) {
            for (var j = response.length - 1; j > i; j--) {
              if (response[j].id === response[i].id) {
                response.splice(j, 1);
                j--;
              }
            }
          }
          response = response.filter(function (item) {
            return item.fsn.term.toLowerCase() === searchStr.toLowerCase() || item.id === searchStr;
          });
          return response;
        };
        scope.getConceptsForValueTypeahead = function (attributeId, searchStr) {
          return snowowlService.getAttributeValues(scope.branch, attributeId, searchStr).then(function (response) {

            if (!response) {
              return [];
            }

            // remove duplicates
            for (var i = 0; i < response.length; i++) {
              var status = 'FD';
              if (response[i].definitionStatus === 'PRIMITIVE') {
                status = 'P';
              }
              if (response[i].fsn) {
                response[i].tempFsn = response[i].fsn.term + ' - ' + status;
                for (var j = response.length - 1; j > i; j--) {
                  if (response[j].id === response[i].id) {
                    response.splice(j, 1);
                    j--;
                  }
                }
              }
            }
            return response;
          });
        };

        scope.getConceptForValueTypeahead = function (attributeId, searchStr) {
          return snowowlService.getAttributeValuesByConcept(scope.branch, attributeId, searchStr).then(function (response) {

            if (!response) {
              return [];
            }

            // remove duplicates
            for (var i = 0; i < response.length; i++) {
              var status = 'FD';
              if (response[i].definitionStatus === 'PRIMITIVE') {
                status = 'P';
              }
              if (response[i].fsn) {
                response[i].tempFsn = response[i].fsn.term + ' - ' + status;
                for (var j = response.length - 1; j > i; j--) {
                  if (response[j].id === response[i].id) {
                    response.splice(j, 1);
                    j--;
                  }
                }
              }
            }
            return response;
          });
        };

        scope.getConceptForValueTypeahead = function (attributeId, searchStr) {
          return snowowlService.getAttributeValuesByConcept(scope.branch, attributeId, searchStr).then(function (response) {

            if (!response) {
              return [];
            }

            // remove duplicates
            for (var i = 0; i < response.length; i++) {
              var status = 'FD';
              if (response[i].definitionStatus === 'PRIMITIVE') {
                status = 'P';
              }
              if (response[i].fsn) {
                response[i].tempFsn = response[i].fsn.term + ' - ' + status;
                for (var j = response.length - 1; j > i; j--) {
                  if (response[j].id === response[i].id) {
                    response.splice(j, 1);
                    j--;
                  }
                }
              }
            }
            return response;
          });
        };

        scope.setRelationshipTypeConceptFromMrcm = function (relationship, item) {
          if (!relationship || !item) {
            console.error('Cannot set relationship concept field, either field or item not specified');
          }

          relationship.type.conceptId = item.id;
          relationship.type.fsn = item.fsn.term;

          scope.updateRelationship(relationship, false);
        };

        scope.setRelationshipTargetConceptFromMrcm = function (relationship, item) {
          if (!relationship || !item) {
            console.error('Cannot set relationship concept field, either field or item not specified');
          }
          relationship.target.conceptId = item.id;
          relationship.target.fsn = item.fsn.term;
          relationship.target.definitionStatus = item.definitionStatus;

          scope.updateRelationship(relationship, false);
        };

//////////////////////////////////////////////
// Attribute Removal functions
//////////////////////////////////////////////

        /**
         * Deletes a given description by index from the descriptions array
         * and then updates the ui-state for the concept
         * @param description
         */
        scope.deleteDescription = function (description) {
          var index = scope.concept.descriptions.indexOf(description);
          scope.concept.descriptions.splice(index, 1);
          autoSave();
        };

        /**
         * Deletes a given relationship by index from the relationships
         * array and then updates the ui-state for the concept
         * @param relationship
         */
        scope.deleteRelationship = function (relationship) {
          var index = scope.concept.relationships.indexOf(relationship);
          scope.concept.relationships.splice(index, 1);
          scope.getDomainAttributes();
          autoSave();
        };

//////////////////////////////////////////////
// Model functions
//////////////////////////////////////////////

        /**
         * Hides or displays model for a given concept (edit view only)
         * @param concept
         */
        scope.modelVisible = true;
        scope.showModel = function (concept) {
          scope.modelVisible = !scope.modelVisible;
          if ($('#image-' + concept.conceptId).css('display') === 'none') {
            $('#image-' + concept.conceptId).css('display', 'inline-block');
          }
          else {
            $('#image-' + concept.conceptId).css('display', 'none');
          }
        };

//////////////////////////////////////////////////////////
// Component More Details Popover Conditional Direction //
//////////////////////////////////////////////////////////

// set the initial direction based on load position
        $timeout(function () {
          if (document.getElementById('conceptMoreButton').getBoundingClientRect().left < 500) {
            scope.popoverDirection = 'right';
          } else {
            scope.popoverDirection = 'left';
          }
        }, 250);

// sets the popover direction (left, bottom, right) based on current
// position of root element
        scope.setPopoverDirection = function ($event) {
          var direction = 'left';

          // morebuttons are the concept edit panel 'more details' popovers (concept, description, attribute)
          if ($event.target.className.indexOf('morebuttons') >= 0) {
            direction = 'left-top';
          }

          if ($event.pageX < 700) {
            direction = 'right';

            // morebuttons are the concept edit panel 'more details' popovers (concept, description, attribute)
            if ($event.target.className.indexOf('morebuttons') >= 0) {
              direction = 'right-top';
            }
          }

          scope.popoverDirection = direction;
        };

        scope.formatComponentMoreText = function (text) {
          if (!text || text.length === 0) {
            return '';
          }

          // replace underscores with spaces and make only first character
          // upper case
          text = text.replace(/_/g, ' ');
          return text.substr(0, 1).toUpperCase() + text.substr(1).toLowerCase();
        };

//////////////////////////////////////////////////////////////////////////
// Conditional component styling
// ////////////////////////////////////////////////////////////////////////

        var nStyles = 0;

        scope.getConceptStyle = function () {

          if (!scope.componentStyles) {
            return null;
          } else {
            if (scope.componentStyles.hasOwnProperty('conceptStyle')) {
              return scope.componentStyles.conceptStyle.style;
            }
          }
        };

        scope.getComponentStyle = function (id, field, defaultStyle, component) {

          // if dialect automation flag detected
          if (component && component.automationFlag) {
            return 'redhl';
          }

          // if no styless supplied, use defaults
          if (!scope.componentStyles) {
            return defaultStyle;
          }

          // if styling indicated for this component
          else {

            // key is SCTID or SCTID-field pair e.g. 1234567 or 1234567-term
            var key = id + (field ? '-' + field : '');

            if (scope.componentStyles.hasOwnProperty(key)) {
              return scope.componentStyles[key].style;
            } else {
              return defaultStyle;
            }
          }
        };

//////////////////////////////////////////////////////////////////////////
// CHeck for Promoted Task -- must be static
// ////////////////////////////////////////////////////////////////////////

// function to set static flag if task is promoted, regardless of
// other context
        scope.checkPromotedStatus = function () {
          if ($routeParams.taskKey) {
            scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
              scope.task = response;

              if (scope.task.status === 'Promoted') {
                scope.isStatic = true;
              }
            });
          }
        };

        // on load, check task status
        scope.checkPromotedStatus();

        // watch for classification completion request to reload concepts
        // will not affect modified concept data
        scope.$on('reloadConcepts', function () {

          // if modified, do nothing
          if (scope.isModified) {
            // do nothing
          }

          // otherwise, re-retrieve the concept
          else {
            snowowlService.getFullConcept(scope.concept.conceptId, scope.branch).then(function (concept) {
              scope.concept = concept;
            });
          }
        });

        //
        // CRS Key Filtering and Display
        //

        scope.crsFilter = crsService.crsFilter;


        //
        // camelCaseText -> Camel Case Text conversion
        //
        function capitalize(word) {
          return word.charAt(0).toUpperCase() + word.substring(1);
        }

        scope.toCapitalizedWords = function (name) {
          var words = name.match(/[A-Za-z][a-z]*/g);

          return words.map(capitalize).join(' ');
        };

      }
    };

  }
)
;

