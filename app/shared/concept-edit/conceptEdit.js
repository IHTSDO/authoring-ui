'use strict';
angular.module('singleConceptAuthoringApp')

  .directive('typeaheadFocus', function () {
    return {
      require: 'ngModel',
      link: function (scope, element, attr, ngModel) {

        //trigger the popup on 'click' because 'focus'
        //is also triggered after the item selection
        element.bind('click', function () {

          // console.debug('typeaheadFocus click event', ngModel.$viewValue);

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
          // console.debug('emptyormatch', actual, expected);
          if (expected === ' ') {
            return true;
          }
          return actual ? actual.toString().toLowerCase().indexOf(expected.toLowerCase()) > -1 : false;
        };
      }
    };
  });

angular.module('singleConceptAuthoringApp').directive('conceptEdit', function ($rootScope, $timeout, $modal, $q, scaService, snowowlService, objectService, notificationService, $routeParams, metadataService) {
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
        static: '@?',

        // whether this display is part of the merge view, triggers display
        // changes TODO These parameters are getting ridiculous, need to clean
        // this up
        merge: '@?',

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

        saveFunction: '&?'
      },
      templateUrl: 'shared/concept-edit/conceptEdit.html',

      link: function (scope, element, attrs, linkCtrl) //noinspection UnreachableCodeJS
      {

        console.debug('conceptEdit styles', scope.componentStyles);

        if (!scope.concept) {
          console.error('Concept not specified for concept-edit');
          return;
        }

        if (!scope.branch) {
          console.error('Branch not specified for concept-edit');
          return;
        }

        // convert static flag from string to boolean
        if (scope.static === 'true') {
          scope.isStatic = true;
        } else {
          scope.isStatic = false;
        }

        if (scope.autosave === 'false') {
          scope.autosave = false;
        } else {
          scope.autosave = true;
        }

        if (scope.merge === 'true') {
          scope.isMerge = true;
        } else {
          scope.isMerge = false;
        }

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

        // console.debug('entered conceptEdit.js');

        // initialize the last saved version of this concept
        scope.unmodifiedConcept = JSON.parse(JSON.stringify(scope.concept));
        scope.unmodifiedConcept = scope.addAdditionalFields(scope.unmodifiedConcept);
        if (scope.autosave === false) {
          scope.concept = scope.unmodifiedConcept;
        }

        // on load, check if a modified, unsaved version of this concept
        // exists
        if (scope.autosave === true) {
          scaService.getModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId).then(function (modifiedConcept) {

            // console.debug('getting modified concept for task');

            // if not an empty JSON object, process the modified version
            if (modifiedConcept) {

              // console.debug('passed concept', scope.concept);
              // console.debug('modified concept', modifiedConcept);

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
                scope.concept = objectService.getNewConcept(scope.branch);
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

        // console.debug(scope.concept, scope.branch, scope.parentBranch,
        // scope.static);

        // retrieve metadata (only modules for now)
        scope.modules = snowowlService.getModules();
        scope.languages = snowowlService.getLanguages();
        scope.dialects = snowowlService.getDialects();
        scope.allowedAttributes = [];

        // flag for viewing active components only. Defaults to true.
        scope.hideInactive = true;

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
        var inactivateComponentReasons = metadataService.getComponentInactivationReasons();
        var inactivateAssociationReasons = metadataService.getAssociationInactivationReasons();

        // console.debug('conceptEdit inactivateComponentReasons',
        // inactivateComponentReasons, inactivateAssociationReasons);

        scope.removeConcept = function (concept) {
          $rootScope.$broadcast('stopEditing', {concept: concept});
        };

        ///////////////////////////////////////////////
        // Validation and saving
        ///////////////////////////////////////////////

        /**
         * Helper function to save or update concept after validation
         * @param concept
         */
        function saveHelper() {

          // special case:  if merge view, broadcast and return no promise
          if (scope.isMerge) {
            $rootScope.$broadcast('acceptMerge', {concept: scope.concept});
            return;
          }

          // simple promise with resolve/reject on success/failure
          var deferred = $q.defer();

          //// console.debug('update concept', concept);
          /*scope.saveFunction({
           project: $routeParams.projectKey,
           task: $routeParams.taskKey,
           concept: concept
           })*/

          snowowlService.cleanConcept(scope.concept);

          var saveFn = null;
          if (scope.concept.fsn === null) {
            saveFn = snowowlService.createConcept;
          } else {
            saveFn = snowowlService.updateConcept;
          }

          saveFn($routeParams.projectKey,
            $routeParams.taskKey,
            scope.concept).then(function (response) {
              //// console.debug('create', response);
              // successful response will have conceptId
              if (response && response.conceptId) {

                console.debug('Create concept successful');

                // set concept and unmodified state
                scope.concept = response;
                scope.unmodifiedConcept = JSON.parse(JSON.stringify(response));
                scope.unmodifiedConcept = scope.addAdditionalFields(scope.unmodifiedConcept);
                scope.isModified = false;

                // clear the saved modified state
                scaService.saveModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId, null);

                // ensure descriptions & relationships are sorted
                sortDescriptions();
                sortRelationships();

                // broadcast event to any listeners (currently task detail,
                // conflict/feedback resolved lists)
                $rootScope.$broadcast('conceptEdit.conceptChange', {
                  branch: scope.branch,
                  conceptId: scope.concept.conceptId
                });

                // if ui state update function specified, call it (after a
                // moment to let binding update)
                //// console.debug('updating ui state', scope.concept);
                $timeout(function () {

                  if (scope.uiStateUpdateFn) {
                    // console.debug('ui state update fn specified');
                    scope.uiStateUpdateFn();
                  }
                }, 3000);

                deferred.resolve();

              }

              // handle error
              else {
                // set the local error
                console.error('Create concept failed:', response);
                scope.errors = [response.message];
                deferred.reject();
              }
            });

          return deferred.promise;
        }

        // helper function to display validation results based on results from
        // getValidationResultsForConcept
        scope.displayValidationResults = function (results) {
          scope.validationWarnings = {};
          scope.validationErrors = {};

          $timeout(function () {
            scope.validationWarnings = results.warnings;
            scope.validationErrors = results.errors;
            console.debug('validationWarnings', scope.validationWarnings);
            console.debug('validationErrors', scope.validationErrors);
          }, 250);
        };

        scope.$watch('validationWarnings', function () {
          console.debug('validationWarnings changed', scope.validationWarnings);
        }, true);

        // function to validate concept and display any errors or warnings
        scope.getValidationResultsForConcept = function () {

          return snowowlService.validateConcept($routeParams.projectKey, $routeParams.taskKey, scope.concept).then(function (validationResults) {

            var results = {
              hasWarnings: false,
              hasErrors: false,
              warnings: {},
              errors: {}
            };

            angular.forEach(validationResults, function (validationResult) {
              console.debug(validationResult);
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

            return results;
          }, function (error) {
            notificationService.sendError('Unexpected error validationg concept prior to save');
            return null;
          });
        };

        scope.saveConcept = function () {

          // clear the top level errors and warnings
          scope.errors = null;
          scope.warnings = null;

          // clear the component-level errors and warnings
          scope.validationWarnings = {};
          scope.validationErrors = {};

          // deep-copy object for modification before submission
          // i.e. strip local values without modifying the current object
          //var concept = JSON.parse(JSON.stringify(scope.concept));

          // display error msg if concept not valid but no other
          // errors/warnings specified
          if (!scope.isConceptValid(scope.concept) && !scope.errors && !scope.warnings) {
            scope.errors = ['Concept is not complete, and cannot be saved.  Specify all empty fields and try again.'];
            return;
          }

          // clean concept of any locally added information
          snowowlService.cleanConcept(scope.concept);

          var saveMessage = scope.concept.conceptId ? 'Saving concept: ' + scope.concept.fsn : 'Saving new concept';

          // special case -- don't want save notifications in merge view, all
          // handling done in conflicts.js
          if (!scope.merge) {
            notificationService.sendMessage(saveMessage);
          } else {
            notificationService.sendMessage('Saving accepted merged concept...');
          }
          // validate concept first
          scope.getValidationResultsForConcept().then(function (validationResults) {

            if (!validationResults) {
              return;
            }

            // special case -- merge:  display warnings and continue
            if (scope.merge) {
              // display the validation warnings and continue
              scope.displayValidationResults(validationResults);
              $rootScope.$broadcast('acceptMerge', {
                concept: scope.concept,
                validationResults: validationResults
              });
            }

            // if errors, notify and do not save
            else if (validationResults && validationResults.hasErrors) {
              notificationService.sendError('Concept contains convention errors. Please resolve before saving.');
              scope.displayValidationResults(validationResults);
            }

            // if no errors but warnings, save, results will be displayed after
            // save NOTE: Do not notify or display until after save, as
            // component ids may change on return from term server
            else if (validationResults && validationResults.hasWarnings) {

              // save the concept with warnings
              saveHelper(scope.concept, true).then(function () {

                  // check the newly returned concepts for persistent warnings
                  scope.getValidationResultsForConcept().then(function (newValidationResults) {

                    // if warnings still detected, notify and display (will
                    // also display errors, which should not happen)
                    if (newValidationResults.hasWarnings) {

                      notificationService.sendWarning('Concept saved, but convention warnings were detected');
                      console.debug('new Validation Results', newValidationResults);
                      scope.displayValidationResults(newValidationResults);

                    }

                    // otherwise, simply notify of save
                    else {
                      notificationService.sendMessage('Concept saved:' + scope.concept.fsn, 5000);
                    }
                  });
                },
                // on error, notifyh
                function (error) {
                  notificationService.sendError('Concept with convention warnings failed to save; displaying initial warnings.');
                  scope.displayValidationResults(validationResults);
                });

            }

            // otherwise, just save
            else {
              saveHelper(scope.concept).then(function () {
                notificationService.sendMessage('Concept saved:' + scope.concept.fsn, 5000);
              }, function (error) {
                notificationService.sendError('Error saving concept');
              });
            }

          });
        };

// function to toggle active status of concept
// cascades to children components
// NOTE: This function hard-saves the concept, to prevent sync errors
// between inactivation reason persistence and concept state
        scope.toggleConceptActive = function () {

          if (scope.isStatic) {
            return;
          }

          // console.debug(scope.concept, scope.unmodifiedConcept);

          // if active, ensure concept is fully saved prior to inactivation
          // don't want to persist the inactivation reason without a forced
          // save
          if (false && scope.isModified) {
            window.alert('You must save your changes to the concept before ' + (scope.concept.active ? 'inactivation.' : 'reactivation.'));
            return;
          }

          // if inactive, simply set active and autoSave
          if (!scope.concept.active) {
            scope.concept.active = true;
            scope.saveConcept();
          }

          // otherwise, open a select reason modal
          else {
            selectInactivationReason('Concept', inactivateComponentReasons, inactivateAssociationReasons, scope.concept.conceptId, scope.branch).then(function (results) {

              notificationService.sendMessage('Inactivating concept (' + results.reason.text + ')');
              // console.debug(scope.branch, scope.concept.conceptId, reason,
              // associationTarget);

              snowowlService.inactivateConcept(scope.branch, scope.concept.conceptId, results.reason.id, results.associationTarget).then(function () {

                scope.concept.active = false;

                // if reason is selected, deactivate all descriptions and
                // relationships
                if (results.reason) {

                  // straightforward inactivation of relationships
                  // NOTE: Descriptions stay active so a FSN can still be
                  // found
                  angular.forEach(scope.concept.relationships, function (relationship) {
                    relationship.active = false;
                  });

                  // save concept but bypass validation checks
                  saveHelper().then(function() {
                    notificationService.sendMessage('Concept inactivated');
                  }, function(error) {
                    notificationService.sendError('Concept inactivation indicator persisted, but concept could not be saved');
                  })
                }
              }, function () {
                notificationService.sendError('Could not save inactivation reason for concept, concept will remain active');
              });

            });
          }
        };

        /**
         * Function to toggle the definition status of the displayed concept,
         * with autosave
         */
        scope.toggleConceptDefinitionStatus = function () {
          // console.debug(scope.concept.definitionStatus);
          // only action required is autosave, value is changed via select
          // (unlike toggle buttons)
          autoSave();
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

////////////////////////////////
// Description Elements
////////////////////////////////

// define available languages
        scope.languages = [
          'en'
        ];

// Define definition types
// NOTE:  PT is not a SNOMEDCT type, used to set acceptabilities
        scope.descTypeIds = [
          {id: '900000000000003001', abbr: 'FSN', name: 'FSN'},
          {id: '900000000000013009', abbr: 'SYN', name: 'SYNONYM'},
          {id: '900000000000550004', abbr: 'DEF', name: 'TEXT_DEFINITION'}
        ];

// define the available dialects
        scope.dialects = {
          'en-us': '900000000000509007',
          'en-gb': '900000000000508004'
        };

// define acceptability types
        scope.acceptabilityAbbrs = {
          'PREFERRED': 'P',
          'ACCEPTABLE': 'A'
        };

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

            // console.debug('sort on active', a.active, b.active);

            // active before inactive
            if (a.active === false && b.active === true) {
              return 1;
            }
            if (b.active === false && a.active === true) {
              return -1;
            }

            // sort based on type

            // console.debug('sort on type', a.type, b.type);
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
            // console.debug('sort on acceptability map', a.acceptabilityMap,
            // b.acceptabilityMap, !a.acceptabilityMap, !b.acceptabilityMap);
            if (a.acceptabilityMap && !b.acceptabilityMap) {
              return -1;
            }
            if (!b.acceptabilityMap && a.acceptabilityMap) {
              return 1;
            }

            if (a.acceptabilityMap && b.acceptabilityMap) {

              // sort on en-us value first
              var aUS = a.acceptabilityMap[scope.dialects['en-us']];
              var bUS = b.acceptabilityMap[scope.dialects['en-us']];
              // console.debug('sorting on en-us', aUS, bUS);
              if (aUS !== bUS) {

                // specified value first
                if (aUS && !bUS) {
                  return -1;
                }
                if (bUS && !aUS) {
                  return 1;
                }

                // if both defined, one must be PREFERRED
                if (aUS === 'PREFERRED') {
                  return -1;
                }
                if (bUS === 'PREFERRED') {
                  return 1;
                }
              }

              // sort on en-us value first
              var aGB = a.acceptabilityMap[scope.dialects['en-gb']];
              var bGB = b.acceptabilityMap[scope.dialects['en-gb']];
              // console.debug('sorting on en-gb', aGB, bGB);
              if (aGB !== bGB) {
                // console.debug('not equal');

                // specified value first
                if (aGB && !bGB) {
                  return -1;
                }
                if (bGB && !aGB) {
                  return 1;
                }

                // if both defined, one must be PREFERRED
                if (aGB === 'PREFERRED') {
                  // console.debug('a preferred');
                  return -1;
                }
                if (bGB === 'PREFERRED') {
                  // console.debug('b preferred');
                  return 1;
                }
              }
            }
            // all else being equal, sort on term
            // console.debug('sorting on term', a.term, b.term);
            return a.term < b.term ? -1 : 1;
          });

          // cycle over original descriptions (backward) to reinsert non-typed
          // descriptions
          for (var i = 0; i < scope.concept.descriptions.length; i++) {
            if (!scope.concept.descriptions[i].type) {
              newArray.splice(i, 0, scope.concept.descriptions[i]);
            }
          }

          //// console.debug('new array', newArray);

          // replace descriptions
          scope.concept.descriptions = newArray;

          //
        }

        function sortRelationships() {

          if (!scope.concept || !scope.concept.relationships) {
            return;
          }

          console.debug('sorting relationships');

          var isaRels = scope.concept.relationships.filter(function (rel) {
            return rel.type.conceptId === '116680003';
          });

          var attrRels = scope.concept.relationships.filter(function (rel) {
            return rel.type.conceptId !== '116680003';
          });

          console.debug(isaRels, attrRels);

          // console.debug(isaRels, attrRels);

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
        var inactivateDescriptionReasons = [

          {id: '', text: 'No reason'},
          {id: 'MOVED_ELSEWHERE', text: 'Concept moved elsewhere'},
          {id: 'CONCEPT_NON_CURRENT', text: 'Concept not current'},
          {id: 'DUPLICATE', text: 'Duplicate concept'},
          {id: 'ERRONEOUS', text: 'Erroneous concept'},
          {id: 'INAPPROPRIATE', text: 'Inappropriate concept'},
          {id: 'LIMITED', text: 'Limited concept'},
          {id: 'OUTDATED', text: 'Outdated concept'},
          {id: 'PENDING_MOVE', text: 'Pending move'}

        ];

// get viewed descriptions
        scope.getDescriptions = function () {
          var descs = [];

          if (!scope.concept.descriptions) {
            return descs;
          }

          for (var i = 0; i < scope.concept.descriptions.length; i++) {

            // check hideInactive
            if (!scope.hideInactive || (scope.hideInactive && scope.concept.descriptions[i].active === true)) {
              descs.push(scope.concept.descriptions[i]);
            }

          }
          return descs;
        };

// Adds a description to the concept
// arg: afterIndex, integer, the index at which to add description
// after
        scope.addDescription = function (afterIndex) {

          var description = objectService.getNewDescription(null);

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
          // console.debug('toggling description active', description);

          // if inactive, simply set active
          if (!description.active) {
            description.active = true;
            autoSave();
          }

          // if an unpublished description, no reason required
          else if (!description.effectiveTime) {
            description.active = false;

            // ensure all minimum fields are present
            objectService.applyMinimumFields(scope.concept);

            autoSave();
          }

          // otherwise, open a select reason modal
          else {
            // TODO Decide what the heck to do with result
            selectInactivationReason('Description', inactivateDescriptionReasons, null, null, null).then(function (results) {

              notificationService.sendMessage('Inactivating description (' + results.reason.text + ')');

              // if a reason supplied
              if (results.reason.id) {

                // persist the inactivation reason
                snowowlService.inactivateDescription(scope.branch, description.descriptionId, results.reason.id).then(function (response) {
                  description.active = false;
                  scope.saveConcept();
                }, function (error) {
                  notificationService.sendError('Error inactivating description');
                });

              }

              // if no reason supplied, simply save the concept
              else {
                description.active = false;
                scope.saveConcept();
              }
            });
          }
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

// languages available

// toggles the acceptability map entry based on dialect name
// if no value, sets to PREFERRED
        scope.toggleAcceptability = function (description, dialectName) {

          if (!description.acceptabilityMap) {
            description.acceptabilityMap = {};
          }

          description.acceptabilityMap[scope.dialects[dialectName]] =
            description.acceptabilityMap[scope.dialects[dialectName]] === 'PREFERRED' ?
              'ACCEPTABLE' : 'PREFERRED';

          autoSave();
        };

        /*

         conceptEdit.js:536
         en-gb
         900000000000509004
         undefined
         Object {900000000000509007: "ACCEPTABLE", 900000000000508004: "PREFERRED"}
         undefined
         undefined
         undefined

         /*

         // returns the display abbreviation for a specified dialect
         */
        scope.getAcceptabilityDisplayText = function (description, dialectName) {
          if (!description || !dialectName) {
            return null;
          }
          var dialectId = scope.dialects[dialectName];

          // if no acceptability map specified, return null
          if (!description.acceptabilityMap) {
            return null;
          }

          // retrieve the value (or null if does not exist) and return
          var acceptability = description.acceptabilityMap[dialectId];
          //If the desciption is an FSN then set to PREFERRED and
          // continue.Simplest place in execution to catch the creation of
          // new FSN's and update acceptability
          if (description.type === 'FSN') {
            if (acceptability !== 'PREFERRED') {
              description.acceptabilityMap[dialectId] = 'PREFERRED';
            }
          }
          return scope.acceptabilityAbbrs[acceptability];
        };

        ////////////////////////////////
        // Relationship Elements
        ////////////////////////////////

        scope.relationshipGroups = {};

        scope.filterRelationships = function(rel) {
          return !scope.hideInactive || rel.active;
        };


        // function compute the relationship groups
        scope.computeRelationshipGroups = function () {

          // sort relationships to ensure proper sorting
          sortRelationships();

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

          console.debug('rel groups', scope.relationshipGroups);
        };

// define characteristic types
        scope.characteristicTypes = [
          {id: 'STATED_RELATIONSHIP', abbr: 'Stated'},
          {id: 'INFERRED_RELATIONSHIP', abbr: 'Inferred'}
        ];
        /*
         // Adds an Is A relationship at the specified position
         // arg: afterIndex, int, the position after which relationship to be
         // added NOTE: This is relative to is a relationships ONLY
         scope.addIsaRelationship = function (afterIndex) {

         //// console.debug('adding attribute relationship', afterIndex);

         var relationship = objectService.getNewIsaRelationship(null);

         // if afterIndex not supplied or invalid, simply add
         if (afterIndex === null || afterIndex === undefined) {
         scope.concept.relationships.push(relationship);

         autoSave();
         }

         // otherwise, add at the index specified
         else {
         // find the index of the requested insertion point
         var rels = scope.getIsARelationships();
         var relIndex = scope.concept.relationships.indexOf(rels[afterIndex]);

         // console.debug('found relationship index', relIndex);

         // add the relationship
         scope.concept.relationships.splice(relIndex + 1, 0, relationship);

         autoSave();
         }
         };*/

        scope.addRelationship = function (relGroup) {

          var relationship = objectService.getNewAttributeRelationship(null);

          // set role group if specified
          if (relGroup) {
            relationship.groupId = relGroup;
          }

          scope.concept.relationships.push(relationship);

          autoSave();

          scope.computeRelationshipGroups();

        };

        scope.removeRelationship = function (relationship) {
          console.debug(scope.concept.relationships, relationship);
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
          relationship.active = !relationship.active;
          objectService.applyMinimumFields(scope.concept);
          scope.getDomainAttributes();
          autoSave();
        };

        scope.getConceptsForTypeahead = function (searchStr) {
          // console.debug('entered getConceptsForTypeAhead', searchStr);
          return snowowlService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, searchStr, 0, 20, null).then(function (response) {

            // remove duplicates
            for (var i = 0; i < response.length; i++) {
              // console.debug('checking for duplicates', i, response[i]);
              for (var j = response.length - 1; j > i; j--) {
                if (response[j].concept.conceptId === response[i].concept.conceptId) {
                  // console.debug(' duplicate ', j, response[j]);
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

          // console.debug('setting relationship type concept',
          // relationship, item);

          relationship.type.conceptId = item.concept.conceptId;
          relationship.type.fsn = item.concept.fsn;

          scope.updateRelationship(relationship);
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

          // console.debug('setting relationship target concept',
          // relationship, item);

          relationship.target.conceptId = item.concept.conceptId;
          relationship.target.fsn = item.concept.fsn;

          scope.updateRelationship(relationship);
        };

////////////////////////////////
// Shared Elements
////////////////////////////////

// deactivation modal for reason s elect
        var selectInactivationReason = function (componentType, reasons, associationTargets, conceptId, branch) {

          // console.debug('selectInactivationReason', componentType,
          // reasons, associationTargets, conceptId, branch);

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
              branch: function () {
                return branch;
              }

            }
          });

          modalInstance.result.then(function (results) {
            console.log(results);
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
          // console.debug('getConceptIdNamePair');
          return {
            id: relationship.target.conceptId,
            name: relationship.target.fsn
          };
        };

// construct an id-name pair json object from attribute type
        scope.getConceptIdNamePairFromAttributeType = function (relationship) {
          // console.debug('getConceptIdNamePair');
          return {
            id: relationship.type.conceptId,
            name: relationship.type.fsn
          };
        };

        scope.dropRelationshipTarget = function (relationship, data) {

          console.debug('dropped target', data, relationship);

          // cancel if static
          if (scope.isStatic) {
            return;
          }
          // console.debug('Drag-n-drop: Relationship Target');

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

          if(relationship.type.conceptId !== null){
              // check if allowable relationship target using concept id
              scope.getConceptsForValueTypeahead(relationship.type.conceptId, data.name).then(function (response) {
                if (response && response.length > 0) {
                  relationship.target.conceptId = data.id;
                  relationship.target.fsn = data.name;
                  scope.warnings = null;
                  scope.updateRelationship(relationship);
                }

                // notify user of inappropriate relationship target by MRCM
                // rules
                else {
                  scope.warnings = ['MRCM validation error: ' + data.name + ' is not a valid target concept.'];
                  relationship.target.fsn = tempFsn;
                }

              });
          }
            else{
                relationship.target.conceptId = data.id;
                relationship.target.fsn = data.name;
                scope.warnings = null;
                scope.updateRelationship(relationship);
            }
        };

        scope.dropRelationshipType = function (relationship, data) {

          // console.debug('dropped type', data);

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
          var attributes = scope.getConceptsForAttributeTypeahead(data.name);
          if (attributes && attributes.length > 0) {
            relationship.type.conceptId = data.id;
            relationship.type.fsn = data.name;
            scope.warnings = null;
            scope.updateRelationship(relationship);
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

          // console.debug('dropDescription', target, source);

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

          // console.debug(target,
          // objectService.getNewDescription(scope.concept.conceptId));

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

          // console.debug('dropRelationship', target, source);

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

          autoSave();

          scope.computeRelationshipGroups();
        };

        scope.dropRelationshipGroup = function (relGroup) {

          console.debug('dropped relationship group', relGroup);

          if (!relGroup || relGroup.length === 0) {
            return;
          }

          if (scope.isStatic) {
            return;
          }

          // get the max group id and increment by one (or set to zero if no
          // groups defined)
          var maxGroup = -1;
          angular.forEach(scope.concept.relationships, function(rel) {
            if (parseInt(rel.groupId) > maxGroup) {
              maxGroup = parseInt(rel.groupId);
            }
          });
          var newGroupId = maxGroup + 1;

          console.debug('new group id ', newGroupId);

          // strip identifying information from each relationship and push to
          // relationships with new group id
          angular.forEach(relGroup, function (rel) {
            if (rel.active === true)
            {
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

                // push to relationships
                scope.concept.relationships.push(copy);
            }
          });

          // recompute the relationship groups
          scope.computeRelationshipGroups();

          autoSave();
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

          // retrieve inactivation reason if inactive
          if (!concept.active) {
            snowowlService.getConceptProperties(concept.conceptId, scope.branch).then(function (response) {

              // console.debug('inactive concept properties', response);

              if (!response.inactivationIndicator) {
                concept.inactivationIndicator = 'No reason specified';
              } else {
                concept.inactivationIndicator = response.inactivationIndicator;
              }

              if (response.associationTargets) {
                concept.associationTargets = response.associationTargets;
                // console.debug('key check',
                // Object.keys(concept.associationTargets));
                scope.hasAssociationTargets = Object.keys(concept.associationTargets).length > 0;
              }
            });
          }
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

          // retrieve inactivation reason if inactive
          if (!description.active) {
            snowowlService.getDescriptionProperties(description.descriptionId, scope.branch).then(function (response) {
              if (!response.inactivationIndicator) {
                description.inactivationIndicator = 'No reason specified';
              } else {
                description.inactivationIndicator = response.inactivationIndicator;
                description.released = response.released;
              }
            });
          }
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

          console.debug('Checking concept valid', concept);

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
            scope.warnings = ['Concept with id: ' + concept.conceptId + ' Must have exactly one active FSN. Concept not saved.'];
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

          // console.debug('updateDescription');
          if (!description) {
            return;
          }

          autoSave();
        };

// function to update relationship and autoSave if indicated
        scope.updateRelationship = function (relationship) {
          scope.getDomainAttributes();
          if (!relationship) {
            return;
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

          // console.debug('saveModifiedConcept', scope.concept,
          // scope.unmodifiedConcept);

          // if changed
          if (scope.concept !== scope.unmodifiedConcept) {

            // broadcast event to any listeners (currently task detail)
            $rootScope.$broadcast('conceptEdit.conceptModified', {
              branch: scope.branch,
              conceptId: scope.concept.conceptId
            });

            scope.isModified = true;

            // store the modified concept in ui-state
            scaService.saveModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId, scope.concept).then(function () {
              // do nothing
            });
          } else {
            scope.isModified = false;
          }
        }

        /**
         * Autosaves the concept modifications and updates history
         * NOTE: outside $watch to prevent spurious updates
         */
        function autoSave() {
          if (scope.autosave === true) {
            // console.debug('conceptEdit: autosave called', scope.concept
            // === scope.lastModifiedConcept, scope.concept);

            scope.conceptHistory.push(JSON.parse(JSON.stringify(scope.concept)));
            scope.conceptHistoryPtr++;

            // console.debug('autosave', scope.conceptHistory);

            // save the modified concept
            saveModifiedConcept();
          }

        }

        /**
         * Resets concept history
         */
        function resetConceptHistory() {
          scope.conceptHistory = [JSON.parse(JSON.stringify(scope.concept))];
          scope.conceptHistoryPtr = 0;
        }

        /**
         * Undo:  Decrement history pointer and update display
         */
        scope.undo = function () {
          if (scope.conceptHistoryPtr > 0) {
            scope.conceptHistoryPtr--;
            scope.concept = scope.conceptHistory[scope.conceptHistoryPtr];
            // console.debug('undo results', scope.concept);

            saveModifiedConcept();
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
          }
        };

        /**
         * Undo all:  Add original version to end of history and update
         * display
         */
        scope.undoAll = function () {

          // if no previously published state, get a new (blank) concept
          if (scope.concept.conceptId === 'unsaved' || !scope.concept.conceptId) {

            scope.concept = objectService.getNewConcept(scope.branch);
            scope.unmodifiedConcept = JSON.parse(JSON.stringify(scope.concept));
            scope.isModified = false;

          } else {
            notificationService.sendMessage('Reverting concept...');
            snowowlService.getFullConcept(scope.concept.conceptId, scope.branch).then(function (response) {
              notificationService.sendMessage('Concept successfully reverted to saved version', 5000);
              scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId);
              scope.concept = response;
              scope.unmodifiedConcept = JSON.parse(JSON.stringify(response));
              scope.unmodifiedConcept = scope.addAdditionalFields(scope.unmodifiedConcept);
              scope.isModified = false;
              scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId);
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
          console.log('watcher: relationships changed');
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
          console.debug('getConceptsForAttributeTypeahead', searchStr, scope.allowedAttributes);
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
        scope.getConceptsForValueTypeahead = function (attributeId, searchStr) {
          return snowowlService.getAttributeValues(scope.branch, attributeId, searchStr).then(function (response) {
            // remove duplicates
            for (var i = 0; i < response.length; i++) {
              var status = 'FD';
              if (response[i].definitionStatus === 'PRIMITIVE') {
                status = 'P';
              }
              response[i].tempFsn = response[i].fsn.term + ' - ' + status;
              // console.debug('checking for duplicates', i, response[i]);
              for (var j = response.length - 1; j > i; j--) {
                if (response[j].id === response[i].id) {
                  response.splice(j, 1);
                  j--;
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

          // console.debug('setting relationship type concept',
          // relationship, item);

          relationship.type.conceptId = item.id;
          relationship.type.fsn = item.fsn.term;

          scope.updateRelationship(relationship);
        };

        scope.setRelationshipTargetConceptFromMrcm = function (relationship, item) {
          if (!relationship || !item) {
            console.error('Cannot set relationship concept field, either field or item not specified');
          }

          // console.debug('setting relationship type concept',
          // relationship, item);
          relationship.target.conceptId = item.id;
          relationship.target.fsn = item.fsn.term;
          relationship.target.definitionStatus = item.definitionStatus;

          scope.updateRelationship(relationship);
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
          console.debug($event.pageX);
          if ($event.pageX < 700) {
            scope.popoverDirection = 'right';
          } else {
            scope.popoverDirection = 'left';
          }
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

        scope.getComponentStyle = function (id, field, defaultStyle) {


          // if no styless supplied, use defaults
          if (!scope.componentStyles) {
            return defaultStyle;
          }

          // if styling indicated for this component
          else {

            // key is SCTID or SCTID-field pair e.g. 1234567 or 1234567-term
            var key = id + (field ? '-' + field : '');

            if (nStyles === 0) {
              // console.debug(scope.componentStyles);
            }

            if (nStyles++ < 10) {
              // console.debug(id, field, defaultStyle, key,
              // scope.componentStyles.hasOwnProperty(key),
              // scope.componentStyles[key] ?
              // scope.componentStyles[key].style : 'No styles');
            }

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

        // function to set static flag if task is promoted, regardless of other
        // context
        scope.checkPromotedStatus = function () {
          if ($routeParams.taskKey) {
            scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
              scope.task = response;

              console.debug('Task', scope.task);

              if (scope.task.status === 'Promoted') {
                console.debug('setting static to true, task is Promoted');
                scope.isStatic = true;
              }
            });
          }
        };

        // on task reload notifications, reload task and set flag
        scope.$on('reloadTask', function () {
          scope.checkPromotedStatus();
        });

        // on initialization, check task status
        scope.checkPromotedStatus();
      }
    };

  }
)
;

