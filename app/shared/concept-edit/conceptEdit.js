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
  })

.directive('customAutofocus', function($timeout) {
  return{
         restrict: 'A',
         link: function(scope, element, attrs){
           scope.$watch(function(){
             return scope.$eval(attrs.customAutofocus);
             },function (newValue){
               var parent = $(element[0]).closest('.editHeightSelector');
               if (newValue === true && element[0].value === ''){
                   if($(element[0]).hasClass('desc') && parent.find("textarea").filter(function() { return this.value == ""; }).length === 1)
                       {
                           $timeout(function () {
                                element[0].focus();
                            }, 200);
                       }
                   else if($(element[0]).hasClass('rel') && parent.find("textarea").filter(function() { return this.value == ""; }).length <= 4)
                       {
                           $timeout(function () {
                                element[0].focus();
                            }, 200);
                       }
               }
           });
         }
     };
});

angular.module('singleConceptAuthoringApp').directive('conceptEdit', function ($rootScope, $timeout, $modal, $q, $interval, scaService, snowowlService, validationService, inactivationService, componentAuthoringUtil, notificationService, $routeParams, metadataService, crsService, constraintService, templateService, modalService, spellcheckService, ngTableParams, $filter, hotkeys, batchEditingService) {
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

        // whether this directive is used in batch view
        batch: '@?',

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
        showInactive: '@?',        

        // a function to update reference concept if any
        updateConceptReference: '&'
      },
      templateUrl: 'shared/concept-edit/conceptEdit.html',

      link: function (scope, element, attrs, linkCtrl)
      {
          
        scope.enterListener = function(event){
            event = event.event
            if(event.keyCode === 13) { 
                event.target.value = event.target.value.replace(/(\r\n|\n|\r)/gm,"");
                event.target.blur();
                var parent = $(event.target).closest('.editHeightSelector');
                if(parent.find("textarea").filter(function() { return this.value == ""; }).length > 0){
                    $timeout(function () {
                        parent.find("textarea").filter(function() { return this.value == ""; })[0].focus();
                    }, 600);
                    
                }
                else{
                    $(this).blur();
                }
            }
        };
        
        scope.focusHandler = function(enter, external){
            if(!scope.hasFocus && enter){
                hotkeys.bindTo(scope)
                .add({
                  combo: 'alt+s',
                  description: 'Save current concept: ' + scope.concept.fsn,
                  callback: function() {if(!scope.static){scope.saveConcept()}}
                })
              hotkeys.bindTo(scope)
                .add({
                  combo: 'alt+r',
                  description: 'Add relationship to current concept: ' + scope.concept.fsn,
                  callback: function() {if(!scope.static && !scope.isLockedModule(scope.concept.moduleId) && !scope.concept.template){scope.addRelationship()}
                  }
                })
              hotkeys.bindTo(scope)
                .add({
                  combo: 'alt+d',
                  description: 'Add description to current concept: ' + scope.concept.fsn,
                  callback: function() {if(!scope.static){scope.addDescription()}}
                })
              hotkeys.bindTo(scope)
                .add({
                  combo: 'alt+g',
                  description: 'Add role group to current concept: ' + scope.concept.fsn,
                  callback: function() {if(!scope.static && !scope.isLockedModule(scope.concept.moduleId)  && !scope.template && !scope.concept.template){scope.addRelationshipGroup()}}
                })
              hotkeys.bindTo(scope)
                .add({
                  combo: 'alt+x',
                  description: 'Remove current concept from edit panel: ' + scope.concept.fsn,
                  callback: function() {scope.removeConcept(scope.concept)}
                })
              hotkeys.bindTo(scope)
                .add({
                  combo: 'alt+a',
                  description: 'Toggle display of active/inactive: ' + scope.concept.fsn,
                  callback: function() {scope.toggleHideInactive()}
                })
              scope.hasFocus = true;
                $rootScope.$broadcast('conceptFocused', {id : scope.concept.conceptId});
                if(!external){
                    $timeout(function() {
                      scope.$digest();
                    });
                }
            }
            else if (!enter){
                scope.hasFocus = false;
                if(!external){
                  $timeout(function() {
                    scope.$digest();
                  });                    
                }
            }
        }
          
        var focusListener = function () {
            scope.focusHandler(true, false);
          };
          

          element[0].addEventListener('mouseenter', focusListener, true);
          element[0].addEventListener('focus', focusListener, true);
          
          scope.$on('conceptFocusedFromKey', function (event, data) {
            if(scope.concept.conceptId === data.id){
                scope.focusHandler(true, true);
            }
              else{
                  scope.focusHandler(false, true);
              }
            
          });
          scope.$on('conceptFocused', function (event, data) {
            if(scope.concept.conceptId === data.id){
                scope.focusHandler(true, false);
            }
              else{
                  scope.focusHandler(false, false);
              }
            
          });
        //Keyboard Shortcuts.
        

        scope.$watch(function () {
          return $rootScope.branchLocked;
        }, function () {

          console.debug('branch locked', $rootScope.branchLocked);

          if ($rootScope.branchLocked) {
            scope.isStatic = true;
          }
          else if (!scope.static) {
            scope.isStatic = false;
          }

        }, true);
        scope.saving = false;
        scope.drugsOrdering = metadataService.getdrugsModelOrdering();
        if (!scope.concept) {
          console.error('Concept not specified for concept-edit');
          return;
        }

        if (!scope.branch) {
          console.error('Branch not specified for concept-edit');
          return;
        }
        if(!metadataService.isTemplatesEnabled()){
            var parentIds = [];
            angular.forEach(scope.concept.relationships, function(rel){
                if(rel.active && rel.characteristicType === 'STATED_RELATIONSHIP' && rel.type.conceptId === '116680003'){
                    parentIds.push(rel.target.conceptId);
                }
            });
            templateService.getTemplates(true, parentIds || undefined, scope.branch).then(function (templates) {
              for(var i = templates.length -1; i >= 0; i--){
                  if(templates[i].additionalSlots.length > 0)
                      {
                          templates.splice(i, 1);
                      }
              };
              scope.templates = templates;
            });
        }
        else{scope.templates = null};


        scope.templateTableParams = new ngTableParams({
        page: 1,
        count: 200,
        sorting: {name: 'asc'}
          },
          {
            filterDelay: 50,
            total: scope.templates ? scope.templates.length : 0, // length of data
            getData: function ($defer, params) {
                var searchStr = params.filter().search;
                var mydata = [];
                if (!scope.templates || scope.templates.length === 0) {
                  $defer.resolve([]);
                } else {
                    if (searchStr) {
                      mydata = scope.templates.filter(function (item) {
                        return item.name.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                      });
                    }
                    else {
                      mydata = scope.templates;
                    }
              // TODO support paging and filtering
              var data = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;
              $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }
          }
        });

        var originalConceptId = null;


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

        if (scope.batch === 'true' || scope.batch === true) {
          scope.isBatch = true;
        } else {
          scope.isBatch = false;
        }

        if (scope.showInactive === 'true' || scope.showInactive === true) {
          scope.hideInactive = false;
        } else {
          scope.hideInactive = true;
        }

        if (scope.concept.validation) {
          scope.validation = scope.concept.validation;
        }

        scope.$on('validation', function() {
          console.debug('new validation', scope.validation);
        })

        //
        // Template service functions
        //

        // utility function pass-thrus
        scope.templateInitialized = false;
        scope.isSctid = snowowlService.isSctid;
        scope.relationshipHasTargetSlot = templateService.relationshipHasTargetSlot;
        scope.relationshipInLogicalModel = templateService.relationshipInLogicalModel;
        scope.getSelectedTemplate = templateService.getSelectedTemplate;

        //
        // Functionality for stashing and reapplying template, intended for use after cleanConcept invocations
        //

        // compares stashed concept components to current components
        // attempts to match by component id, then by component elements
        scope.reapplyTemplate = function () {
          if (scope.template) {
            templateService.applyTemplateToConcept(scope.concept, scope.template);
          }
        };

        scope.applyTemplate = function (template) {
            templateService.applyTemplateToExistingConcept(scope.concept, template).then(function(concept){
                $timeout(function () {
                    scope.template = template;
                    scope.concept = concept;
                    console.log(scope.concept);
                    scope.computeRelationshipGroups();
                    sortDescriptions();
                    sortRelationships();
                  }, 200);
            });
        };

        scope.removeTemplate = function () {

          // if has ID, remove UI State
          if (scope.concept.conceptId) {
            templateService.removeStoredTemplateForConcept($routeParams.projectKey, scope.concept.conceptId).then(function () {
              scope.template = null;
              templateService.removeTemplateFromConcept(scope.concept);
            }, function (error) {
              notificationService.sendError('Error removing template: ' + error);
            });
          }

          // otherwise, simply remove from unsaved concept
          else {
            scope.template = null;
            templateService.removeTemplateFromConcept(scope.concept);
          }
        };


//
// CRS concept initialization
//
        if (crsService.isCrsConcept(scope.concept.conceptId) && $rootScope.pageTitle !== 'Providing Feedback/') {

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
        if (scope.autosave === false && scope.isBatch === false) {
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

            // otherwise, persist modified state for unsaved concept with id
            else if (scope.concept.conceptId && !scope.concept.fsn) {
              saveModifiedConcept();
              scope.isModified = true;
            }

            // once concept fully loaded (from parameter or from modified state), check for template
            templateService.getStoredTemplateForConcept($routeParams.projectKey, scope.concept.conceptId).then(function (template) {
                // if template found in store, apply it to retrieved concept
                if (template) {

                // store in scope variable and on concept (for UI State saving)
                scope.template = template;
                templateService.applyTemplateToConcept(scope.concept, scope.template, false, false, false).then(function () {
                  resetConceptHistory();
                })

                }

                // check for new concept with non-SCTID conceptId -- ignore blank id concepts
                else if (scope.concept.conceptId && !snowowlService.isSctid(scope.concept.conceptId)) {

                  // if template attached to this concept, use that
                  if (scope.concept.template) {
                    scope.template = scope.concept.template;
                  }

                  // otherwise, check for selected template and apply if exists
                  else {
                    var selectedTemplate = templateService.getSelectedTemplate();

                    if (selectedTemplate) {
                      scope.template = selectedTemplate;
                      templateService.storeTemplateForConcept($routeParams.projectKey, scope.concept.conceptId, selectedTemplate);
                    }
                  }
                }

                scope.templateInitialized = true;
              }
              ,
              function (error) {
                notificationService.sendError('Unexpected error checking for concept template: ' + error);
              }
            );

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
        //var inactivateDescriptionAssociationReasons = metadataService.getDescriptionAssociationInactivationReasons();

        scope.removeConcept = function (concept) {

          if (!snowowlService.isSctid(concept.conceptId)) {
            modalService.confirm('This concept is unsaved; removing it will destroy your work.  Continue?').then(function () {
              scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, concept.conceptId);
              $rootScope.$broadcast('stopEditing', {concept: concept});
            }, function () {
              // do nothing
            });

          } else if (scope.isModified) {
            modalService.confirm('This concept has unsaved changes; removing it will abandon your modifications.  Continue?').then(function () {
              scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, concept.conceptId);
              $rootScope.$broadcast('stopEditing', {concept: concept});
            }, function () {
              // do nothing
            });
          } else {
            $rootScope.$broadcast('stopEditing', {concept: concept});
          }
        };

///////////////////////////////////////////////
// Validation and saving
///////////////////////////////////////////////


// function to validate concept and display any errors or warnings
        scope.validateConcept = function () {
          if (scope.concept.requiresValidation) {
            delete scope.concept.requiresValidation;
          }
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
            deferred.resolve(results);
          }, function (error) {
            notificationService.sendError('Unexpected error validating concept prior to save');
            scope.validation = {};
            deferred.reject();
          });

          return deferred.promise;
        };

// on load, check for expected render flag applied in saveHelper
        if (scope.concept.catchExpectedRender) {
          delete scope.concept.catchExpectedRender;
          scope.validateConcept().then(function () {
            scope.reapplyTemplate();
          });
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


            // In order to ensure proper term-server behavior,
            // need to delete SCTIDs without effective time on descriptions and relationships
            // otherwise the values revert to termserver version
//            angular.forEach(scope.concept.descriptions, function (description) {
//              if (snowowlService.isSctid(description.descriptionId) && !description.effectiveTime && !description.released) {
//                delete description.descriptionId;
//              }
//            });
//            angular.forEach(scope.concept.relationships, function (relationship) {
//              if (snowowlService.isSctid(relationship.relationshipId) && !relationship.effectiveTime && !relationship.released) {
//                delete relationship.relationshipId;
//              }
//            });


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
                  // NOTE: Currently used for re-validation and prevention of spurious modified UI States on load
                  if (saveFn == snowowlService.createConcept) {
                    response.catchExpectedRender = true;
                  }

                  // set concept and unmodified state
                  scope.concept = response;
                  scope.unmodifiedConcept = JSON.parse(JSON.stringify(response));
                  scope.unmodifiedConcept = scope.addAdditionalFields(scope.unmodifiedConcept);
                  scope.isModified = false;

                  // all concept updates should clear the validation failure exclusions
                  validationService.clearValidationFailureExclusionsForConceptId(scope.concept.conceptId);

                  // if a template specified, store template/concept info
                  // store and re-apply the template (if present), cleaned during save
                  if (scope.template) {
                    scope.concept.template = scope.template;
                    templateService.storeTemplateForConcept($routeParams.projectKey, scope.concept.conceptId, scope.template);
                    templateService.logTemplateConceptSave($routeParams.projectKey, scope.concept.conceptId, scope.concept.fsn, scope.template);
                  }

                  // if a crs concept
                  if (crsService.isCrsConcept(originalConceptId)) {
                    var crsConcept = crsService.getCrsConcept(originalConceptId);

                    // if unsaved, update possible GUID and concept property changes in saved and favorite lists
                    if (!crsConcept.saved) {
                      $rootScope.$broadcast('saveCrsConcept', {concept: crsConcept, crsConceptId: originalConceptId});
                    }

                    // update the crs concept
                    crsService.saveCrsConcept(originalConceptId, scope.concept);
                    scaService.saveModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId, null);
                  }

                  // clear the saved modified state from the original concept id
                  scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, originalConceptId, null);


                  // ensure descriptions & relationships are sorted
                  sortDescriptions();
                  sortRelationships();

                  scope.computeRelationshipGroups();

                  // broadcast event to any listeners (currently task detail, crs concept list,
                  // conflict/feedback resolved lists)
                  $rootScope.$broadcast('conceptEdit.conceptChange', {
                    branch: scope.branch,
                    conceptId: scope.concept.conceptId,
                    previousConceptId: originalConceptId,
                    concept: scope.concept,
                    validation: scope.validation
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
          // clear the top level errors and warnings
          scope.errors = null;
          scope.warnings = null;

          // clear the component-level errors and warnings
          scope.validation = {
            'warnings': {},
            'errors': {}
          };

          // Handle save action outside this component, applying for Batch import
          if (scope.isBatch) {
            scope.saving = true;
            scope.saveFunction().then(function(response){
              scope.saving = false;
              if (!response.validation.hasErrors && !response.validation.hasWarnings) {
                notificationService.sendMessage('Concept saved: ' + scope.concept.fsn, 5000);
              }
            },function (error) {
              scope.saving = false;
            });
            return;
          }

          // broadcast event to any listeners (currently task detail, crs concept list,
          // conflict/feedback resolved lists)
          $rootScope.$broadcast('conceptEdit.saveConcept', {
            branch: scope.branch,
            conceptId: scope.concept.conceptId,
            previousConceptId: originalConceptId,
            concept: scope.concept,
            validation: scope.validation
          });

          // display error msg if concept not valid but no other
          // errors/warnings specified
          var errors = scope.isConceptValid(scope.concept);
          if (errors && errors.length > 0) {
            scope.errors = scope.errors ? scope.errors.concat(errors) : errors;
            return;
          }

          // clean concept of any locally added information
          // store original concept id for CRS integration
          var originalConcept = angular.copy(scope.concept);
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

              if (scope.validation && scope.validation.hasErrors) {
                notificationService.sendError('Fix errors before continuing');
                scope.reapplyTemplate();
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
              scope.reapplyTemplate();

              $rootScope.$broadcast('conceptEdit.validation', {
                branch: scope.branch,
                conceptId: scope.concept.conceptId,
                previousConceptId: originalConceptId,
                concept: scope.concept,
                validation: scope.validation
              });

              return;
            }

            if (originalConcept.conceptId) {
              scope.concept.conceptId = originalConcept.conceptId;
            }

            // save concept
            saveHelper().then(function () {
              scope.hasFocus = false;

              // brief timeout to alleviate timing issues, may no longer be needed
              $timeout(function () {
                // perform a second validation to catch any convention warnings introduced by termserver
                scope.validateConcept().then(function (results) {
                  if (scope.validation.hasErrors) {
                    notificationService.sendError('Concept saved, but modifications introduced by server led to convention errors. Please review');
                    $rootScope.$broadcast('conceptEdit.validation', {
                      branch: scope.branch,
                      conceptId: scope.concept.conceptId,
                      previousConceptId: originalConceptId,
                      concept: scope.concept,
                      validation: scope.validation
                    });
                  }
                  else if (scope.validation.hasWarnings) {
                    notificationService.sendWarning('Concept saved, but contains convention warnings. Please review');
                    $rootScope.$broadcast('conceptEdit.validation', {
                      branch: scope.branch,
                      conceptId: scope.concept.conceptId,
                      previousConceptId: originalConceptId,
                      concept: scope.concept,
                      validation: scope.validation
                    });
                  } else {
                    notificationService.sendMessage('Concept saved: ' + scope.concept.fsn, 5000);
                    scope.focusHandler(true, false);
                  }
                  scope.saving = false;
                  scope.reapplyTemplate();
                  scope.focusHandler(true, false);
                }, function (error) {
                  notificationService.sendError('Error: Concept saved with warnings, but could not retrieve convention validation warnings');
                  scope.saving = false;
                  scope.reapplyTemplate();
                  scope.focusHandler(true, false);
                });
              }, 500);
            }, function (error) {
              if (error.status === 504) {

                // on timeouts, must save crs concept to ensure termserver retrieval
                if (crsService.isCrsConcept(originalConcept.conceptId)) {
                  crsService.saveCrsConcept(originalConcept.conceptId, scope.concept, 'Save status uncertain; please verify changes via search');
                  scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, originalConcept.conceptId);
                }
                notificationService.sendWarning('Your save operation is taking longer than expected, but will complete. Please use search to verify that your concept has saved and then remove the unsaved version from the edit panel');
              }
              else {
                scope.concept = originalConcept;
                scope.isModified = true;
                notificationService.sendError('Error saving concept: ' + error.statusText);
                scope.focusHandler(true, false);
              }
              scope.reapplyTemplate();
              scope.saving = false;
              scope.focusHandler(true, false);
            });

          }, function (error) {
            notificationService.sendError('Fatal error: Could not validate concept');
            scope.reapplyTemplate();
            scope.saving = false;
            scope.focusHandler(true, false);
          });
        };

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

          // if not an SCTID, simply remove the concept instead of deleting it
          if (!snowowlService.isConceptId(concept.conceptId)) {
            scope.removeConcept(concept);
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

            scope.concept.active = true;
            scope.hideInactive = false;

            scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId);

          }

          // otherwise, proceed with checks and inactivation reason persistence
          else {
            if (deletion) {
              selectInactivationReason('Concept', inactivateConceptReasons, inactivateAssociationReasons, scope.concept.conceptId, scope.concept, scope.branch, deletion).then(function (results) {
                  console.log(results);
                inactivationService.setParameters(scope.branch, scope.concept, null, results.associationTarget);
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

                      // remove from batch editing if any
                      if (!scope.isBatch) {
                        batchEditingService.removeBatchConcept(scope.concept.conceptId);
                      }
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

              // Do not allow inactivation when Relationships or Descriptions have no effective time
              if(conceptCopy.released === true && hasInactiveDescriptionOrRelationship(conceptCopy)) {
                scope.errors = ['This concept has unpublished changes, and therefore cannot be inactivated. Please revert these changes and try again.'];
                scope.componentStyles = (typeof scope.componentStyles !== 'undefined') ? scope.componentStyles : {};
                scope.concept.descriptions.forEach(function (item) {
                  if(!item.released || (item.released && typeof item.effectiveTime === 'undefined')) {
                    item.templateStyle = 'redhl';
                  } else {
                    item.templateStyle = null;;
                  }
                });

                scope.concept.relationships.forEach(function (item) {
                  if(item.characteristicType !== 'INFERRED_RELATIONSHIP'
                    && (!item.released || (item.released && typeof item.effectiveTime === 'undefined'))) {
                    item.templateStyle = 'redhl';
                  } else {
                    item.templateStyle = null;
                  }
                });               
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

        var hasInactiveDescriptionOrRelationship = function(concept) {
          //checking description has no effective time
          for(var i = 0; i < concept.descriptions.length; i++) {
            var desc =  concept.descriptions[i];
            if(!desc.released || (desc.released && typeof desc.effectiveTime === 'undefined')) {
              return true;
            }
          }

          // checking relationships has no effective time and not INFERRED_RELATIONSHIP characteristicType
          for(var i = 0; i < concept.relationships.length; i++) {
            var rel =  concept.relationships[i];
            if(rel.characteristicType !== 'INFERRED_RELATIONSHIP'
              && (!rel.released || (rel.released && typeof rel.effectiveTime === 'undefined'))) {
              return true;             
            }
          }
          return false;          
        }

        /**
         * Function to toggle the definition status of the displayed concept,
         * with autosave
         */
        scope.toggleConceptDefinitionStatus = function () {
          if (!scope.isStatic) {
            if (scope.concept.definitionStatus === 'FULLY_DEFINED') {
              scope.concept.definitionStatus = 'PRIMITIVE';
            }
            else {
              scope.concept.definitionStatus = 'FULLY_DEFINED';
            }
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
        $timeout(function () {
          scope.dialects = metadataService.getAllDialects();
        }, 100);        

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
        scope.dialectLength = null;
        scope.getDialectIdsForDescription = function (description, FSN) {
          var dialects = metadataService.getDialectsForModuleId(description.moduleId, FSN);
          scope.dialectLength = Object.keys(dialects).length;
          return Object.keys(dialects).sort(scope.dialectComparator);
        };

// define acceptability types
        scope.acceptabilityAbbrs = {
          'PREFERRED': 'P',
          'ACCEPTABLE': 'A'
        };

        scope.getExtensionMetadata = metadataService.getExtensionMetadata;

        scope.filterDescriptions = function (d) {
          return !scope.hideInactive || d.active;
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

            // ensure en-us ACCEPTABLE terms on top
            var aHasUsA = a.acceptabilityMap ? a.acceptabilityMap['900000000000509007'] === 'ACCEPTABLE' : false;
            var bHasUsA = b.acceptabilityMap ? b.acceptabilityMap['900000000000509007'] === 'ACCEPTABLE' : false;

            if (aHasUsA && !bHasUsA) {
              return -1;
            }
            if (!aHasUsA && bHasUsA) {
              return 1;
            }
            
            if (!metadataService.isExtensionSet()) {
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
              }
            }

            // comparator function for sorting by acceptabilities within a specified dialect
            var acceptabilityComparator = function (descA, descB, dialect) {

              var aVal = descA.acceptabilityMap ? descA.acceptabilityMap[dialect] : null;
              var bVal = descB.acceptabilityMap ? descB.acceptabilityMap[dialect] : null;

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

          // remove display flag if it's set, and set relationship type to null if concept id or fsn are not set
          angular.forEach(attrRels, function(rel){
              if (rel.display) delete rel.display;
              if (!rel.type.fsn || !rel.type.conceptId) rel.type.conceptId = null;
          });               

          // re-populate display flag if it exists
          angular.forEach(attrRels, function(rel){
              for (var i = 0; i < scope.drugsOrdering.length; i++) {
                var item = scope.drugsOrdering[i];
                if (rel.type.conceptId === item.id) rel.display = item.display;        
              }
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
            if (a.groupId === b.groupId && a.display && b.display) {
              return a.display > b.display;
            } else {
              return a.groupId - b.groupId;
            }
          });
          attrRels  = $filter('orderBy')(attrRels, 'display')
          scope.concept.relationships = isaRels.concat(attrRels);
        }

// on load, sort descriptions && relationships
        sortDescriptions();
        sortRelationships();

        function setDefaultModuleId() {
          var moduleId = metadataService.getCurrentModuleId(); 
          if(!scope.concept.moduleId) {
            scope.concept.moduleId = moduleId;
          }       
          angular.forEach(scope.concept.descriptions, function (description) {
            if(!description.moduleId) {            
              description.moduleId = moduleId;
            }
          });

          angular.forEach(scope.concept.relationships, function (relationship) {
            if(!relationship.moduleId) {             
              relationship.moduleId = moduleId;
            }
            if(!relationship.target.moduleId) {              
              relationship.target.moduleId = moduleId;
            }
          });           
        }

// on load, set default module id for components if not set yet
        setDefaultModuleId();

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
            if (!description.acceptabilityMap || Object.keys(description.acceptabilityMap).length === 0) {
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

          var description;
          var moduleId = metadataService.getCurrentModuleId(); 
          // for extensions with multiple default languages
          if (metadataService.isExtensionSet() && metadataService.getDefaultLanguageForModuleId(moduleId).length >= 1) {
            angular.forEach(metadataService.getDefaultLanguageForModuleId(moduleId), function(language){
                description = componentAuthoringUtil.getNewDescription(moduleId, language);
                if (afterIndex === null || afterIndex === undefined) {
                  scope.concept.descriptions.push(description);
                  autoSave();
                }
                // if in range, add after the specified afterIndex
                else {
                  scope.concept.descriptions.splice(afterIndex + 1, 0, description);
                  autoSave();
                }
            })
          } else {
            description = componentAuthoringUtil.getNewDescription(null);

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
          }
        };

//        function addBelgianDescription(afterIndex) {
//          var dialects = metadataService.getAllDialects();
//          var duDescription = componentAuthoringUtil.getNewDescription(null);
//          var frDescription = componentAuthoringUtil.getNewDescription(null);
//
//          duDescription.acceptabilityMap = {'31000172101':'PREFERRED'}; // SYN DU Preferred Term
//          duDescription.lang = dialects['31000172101'];
//
//          frDescription.acceptabilityMap = {'21000172104':'PREFERRED'}; // SYN FR Preferred Term
//          frDescription.lang = dialects['21000172104'];
//
//          // if not specified, simply push the new description
//          if (afterIndex === null || afterIndex === undefined) {
//            scope.concept.descriptions.push(duDescription);
//            scope.concept.descriptions.push(frDescription);
//            autoSave();
//          }
//          // if in range, add after the specified afterIndex
//          else {
//            scope.concept.descriptions.splice(afterIndex + 1, 0, duDescription);
//            scope.concept.descriptions.splice(afterIndex + 2, 0, frDescription);
//            autoSave();
//          }
//        }

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
            if(scope.isBatch === true){             
              scope.updateConceptReference({concept: scope.concept});
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

          // if an unreleased description, no reason required
          else if (!description.released) {

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

              selectInactivationReason('Description', inactivateDescriptionReasons, inactivateAssociationReasons, null, null, null).then(function (results) {

                notificationService.sendMessage('Inactivating description (' + results.reason.text + ')');

                // if a reason supplied
                if (results.reason.id) {

                  // persist the inactivation reason
//                  snowowlService.inactivateDescription(scope.branch, description.descriptionId, results.reason.id).then(function (response) {
                  description.active = false;
                  description.inactivationIndicator = results.reason.id;

                  if(typeof results.associationTarget !== 'undefined') {
                    description.associationTargets = results.associationTarget;
                  }
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
          selectInactivationReason('Description', inactivateDescriptionReasons, inactivateAssociationReasons, null, null, null).then(function (results) {

            notificationService.sendMessage('Inactivating description (' + results.reason.text + ')');

            // if a reason supplied
            //if (results.reason.id) {

//            // persist the inactivation reason
//            snowowlService.inactivateDescription(scope.branch, item.descriptionId, results.reason.id).then(function (response) {
            item.active = false;
            item.inactivationIndicator = results.reason.id;
            if(typeof results.associationTarget !== 'undefined') {
              item.associationTargets = results.associationTarget;
            }
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
                autoSave();
                break;

              // if acceptable, switch to not acceptable (i.e. clear the dialect
              // key)
              case 'ACCEPTABLE':
                delete description.acceptabilityMap[dialectId];
                autoSave();
                break;

              // if neither of the above, or blank, set to preferred
              default:
                description.acceptabilityMap[dialectId] = 'PREFERRED';
                autoSave();
                break;
            }
          }
          else {
            switch (description.acceptabilityMap[dialectId]) {
              case 'PREFERRED':
                delete description.acceptabilityMap[dialectId];
                autoSave();
                break;

              // if neither of the above, or blank, set to preferred
              default:
                description.acceptabilityMap[dialectId] = 'PREFERRED';
                autoSave();
                break;
            }
          }

        };

// returns the name of a dialect given its refset id
        function getShortDialectName(id) {
          if (!scope.dialects || !scope.dialects[id]) {
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
            autoSave();
          }
          else {
            scope.warnings = ['You must activate the concept before its components.'];
          }
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

          // cancel if template applied and this is not a valid target slot
          if (scope.template && relationship.targetSlot && !relationship.targetSlot.slotName) {
            return;
          }

          if(scope.template && relationship.target && relationship.target.conceptId) {
            return;
          }

          var tempFsn = relationship.target.fsn;

          relationship.target.fsn = 'Validating...';

          // if template supplied, check ECL/ESCG
          if (scope.template) {

            constraintService.isValueAllowedForType(relationship.type.conceptId, data.id, scope.branch,
              relationship.template && relationship.template.targetSlot ? relationship.template.targetSlot.allowableRangeECL : null).then(function () {
              relationship.target.conceptId = data.id;
              relationship.target.fsn = data.name;
              scope.updateRelationship(relationship, false);
            }, function (error) {
              scope.warnings = ['Concept ' + data.id + ' |' + data.name + '| not in target slot allowable range: ' + relationship.template.targetSlot.allowableRangeECL];
              relationship.target.fsn = tempFsn;
            });
          }

          // otherwise use mrcm rules
          else if (metadataService.isMrcmEnabled()) {

            if (relationship.type.conceptId) {

              constraintService.isValueAllowedForType(relationship.type.conceptId, data.id, scope.branch).then(function () {
                relationship.target.conceptId = data.id;
                relationship.target.fsn = data.name;
                scope.updateRelationship(relationship, false);
              }, function (error) {
                scope.warnings = ['MRCM validation error: ' + data.name + ' is not a valid target for attribute type ' + relationship.type.fsn + '.'];
                relationship.target.fsn = tempFsn;
              });
            } else {
              scope.warnings = ['MRCM validation error: Must set relationship type first'];
            }
          }

          // otherwise simply allow drop
          else {
            relationship.target.conceptId = data.id;
            relationship.target.fsn = data.name;
            scope.updateRelationship(relationship, false);
          }
        };


        scope.dropRelationshipType = function (relationship, data) {

          // cancel if static
          if (scope.isStatic) {
            return;
          }

          // cancel if static or released relationship
          if (scope.isStatic || relationship.effectiveTime) {
            return;
          }

          // cancel if template applied -- logical model restricted
          if (scope.template) {
            return;
          }

          // check that attribute is acceptable for MRCM rules
          if (metadataService.isMrcmEnabled()) {

            // check attribute allowed against stored array
            if (constraintService.isAttributeAllowedForArray(data.id, scope.allowedAttributes)) {

              // if target already specified, validate it
              if (relationship.target.conceptId) {
                constraintService.isValueAllowedForType(data.id, relationship.target.conceptId, scope.concept, scope.branch).then(function () {
                  // do nothing
                }, function (error) {
                  scope.warnings = ['MRCM validation error: ' + relationship.target.fsn + ' is not a valid target for attribute type ' + data.name + '.'];
                });
              }

              relationship.type.conceptId = data.id;
              relationship.type.fsn = data.name;

              scope.updateRelationship(relationship, false);
            } else {
              scope.warnings = ['MRCM validation error: ' + data.name + ' is not a valid attribute.'];
            }
          } else {
            relationship.type.conceptId = data.id;
            relationship.type.fsn = data.name;
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

          if (constraintService.isAttributeAllowedForArray(source.type.fsn, scope.allowedAttributes)) {

            constraintService.isValueAllowedForType(source.type.conceptId, source.target.conceptId, scope.branch).then(function () {
              // copy relationship object and replace target relationship
              var copy = angular.copy(source);

              // clear the effective time and source information
              delete copy.sourceId;
              delete copy.effectiveTime;
              delete copy.relationshipId;
              delete copy.released;

              // set the group based on target
              copy.groupId = target.groupId;

              // set module id for new relationship
              copy.moduleId = metadataService.getCurrentModuleId();

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
            }, function () {
              scope.warnings = ['MRCM validation error: ' + source.target.fsn + ' is not valid for attribute type ' + source.type.fsn];
            });
          } else {
            scope.warnings = ['MRCM validation error: Attribute ' + source.type.fsn + ' not allowed for concept'];
          }


        };

        scope.addRelationshipGroup = function () {
          var groupIds = [];
          scope.concept.relationships.forEach(function (rel) {
            if(rel.characteristicType === "STATED_RELATIONSHIP")
              groupIds.push(parseInt(rel.groupId));
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

          if (!relGroup || relGroup.length === 0) {
            return;
          }

          if (scope.isStatic) {
            return;
          }

          // get the max group id and increment by one (or set to zero if no
          // groups defined)
          var maxGroup = -1;
          angular.forEach(scope.concept.relationships, function (rel) {
            if (parseInt(rel.groupId) > maxGroup) {
              maxGroup = parseInt(rel.groupId);
            }
          });
          var newGroup = maxGroup + 1;

          var relsProcessed = 0;

          scope.warnings = [];

          // strip identifying information from each relationship and push
          // to relationships with new group id
          angular.forEach(relGroup, function (rel) {
            if (constraintService.isAttributeAllowedForArray(rel.type.fsn, scope.allowedAttributes)) {

              constraintService.isValueAllowedForType(rel.type.conceptId, rel.target.conceptId, scope.branch).then(function () {
                // copy relationship object and replace target relationship
                var copy = angular.copy(rel);

                // clear the effective time and source information
                delete copy.sourceId;
                delete copy.effectiveTime;
                delete copy.relationshipId;
                delete copy.released;

                // set module id based on metadata
                copy.moduleId = metadataService.getCurrentModuleId();

                // set the group based on target
                copy.groupId = newGroup;

                scope.concept.relationships.push(copy);
                if (++relsProcessed === relGroup.length) {
                  autoSave();
                  scope.computeRelationshipGroups();
                }
              }, function () {
                scope.warnings.push('MRCM validation error: ' + rel.target.fsn + ' is not valid for attribute type ' + rel.type.fsn);
                if (++relsProcessed === relGroup.length) {
                  autoSave();
                  scope.computeRelationshipGroups();
                }
              });
            } else {
              if (++relsProcessed === relGroup.length) {
                autoSave();
                scope.computeRelationshipGroups();
              }
              scope.warnings.push('MRCM validation error: Attribute ' + rel.type.fsn + ' not allowed for concept');
            }
          });

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


        var componentTerms = {};
        scope.getTerm = function (componentId) {
          if (componentTerms.hasOwnProperty(componentId)) {
            return componentTerms[componentId];
          } else {
            componentTerms[componentId] = 'Retrieving term...';
            if (snowowlService.isConceptId(componentId)) {
              snowowlService.getFullConcept(componentId, scope.branch).then(function (response) {
                componentTerms[componentId] = response.fsn;
              });
            } else if (snowowlService.isDescriptionId(componentId)) {
              snowowlService.getDescriptionProperties(componentId, scope.branch).then(function (response) {
                componentTerms[componentId] = response.term;
              })
            }
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


// function to check the full concept for validity before saving
        scope.isConceptValid = function (concept) {
          return componentAuthoringUtil.checkConceptComplete(concept);
        };

        scope.replaceSuggestion = function (description, word, suggestion) {
          if (description.term && word && suggestion) {
            var re = new RegExp(word, 'gi');
            description.term = description.term.replace(re, suggestion);
          }          

          // remove this suggestion
          delete description.spellcheckSuggestions[word];
          if (Object.keys(description.spellcheckSuggestions).length === 0) {
            delete description.spellcheckSuggestions;
          }

          if(scope.isBatch === true){
            scope.updateConceptReference({concept: scope.concept});
          }
        };

// function to update description and autoSave if indicated
        scope.updateDescription = function (description, keepSCTID) {
          if (!keepSCTID) delete description.descriptionId;          
          if (!description) return;        

          // run spellchecker
            console.log(metadataService.isSpellcheckDisabled());
          if(description.term !== null && description.term !== '' && !metadataService.isSpellcheckDisabled()){
              spellcheckService.checkSpelling(description.term).then(function (suggestions) {
                console.log(suggestions);
                if (suggestions && Object.keys(suggestions).length !== 0) {
                  description.spellcheckSuggestions = suggestions;
                }
              });
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
            description.caseSignificance = 'CASE_INSENSITIVE';
          }

          // if this is the FSN, apply defaults (if new) and check if a
          // matching PT should be generated
          else if (description.type === 'FSN') {

            // if a new FSN (determined by no effective time)
            if (!description.effectiveTime && !metadataService.isLockedModule(description.moduleId)) {

              // strip any non-international dialects
              angular.forEach(Object.keys(description.acceptabilityMap), function (dialectId) {
                if (!metadataService.isUsDialect(dialectId) && !metadataService.isGbDialect(dialectId)) {
                  delete description.acceptabilityMap[dialectId];
                }
              });

              // ensure all dialects returned from metadata are preferred
              angular.forEach(scope.getDialectIdsForDescription(description, true), function (dialectId) {
                description.acceptabilityMap[dialectId] = 'PREFERRED';
              });
              description.caseSignificance = 'CASE_INSENSITIVE';
            }            
          }

          if(scope.isBatch === true){
            scope.updateConceptReference({concept: scope.concept});
          }

          componentAuthoringUtil.runDescriptionAutomations(scope.concept, description, scope.template ? true : false).then(function () {            
              autoSave();
          }, function (error) {
            notificationService.sendWarning('Automations failed: ' + error);
            autoSave();
          });
        };

// function to update relationship and autoSave if indicated
        scope.updateRelationship = function (relationship, roleGroupOnly, keepSCTID) {
          if(!roleGroupOnly && !keepSCTID){
              delete relationship.relationshipId;
          }
          if (!relationship) {
            return;
          }

          // If template enabled, relationship must contain target slot
          if (relationship.targetSlot) {
            // clear validation errors
            scope.validation = {};


            templateService.updateTargetSlot(scope.concept, scope.template, relationship).then(function () {
              scope.computeRelationshipGroups();
              sortRelationships();

              // run international dialect automations on target slot update (if appropriate)
              if (!metadataService.isExtensionSet()) {

                // if all target slots are set
                if (scope.concept.relationships.filter(function (r) {
                    return r.targetSlot && !r.target.conceptId;
                  }).length === 0) {

                  // run automations with isTemplateConcept flag set to ensure proper behavior
                  componentAuthoringUtil.runInternationalDialectAutomationForConcept(scope.concept, true).then(function () {
                    sortDescriptions();
                    autoSave();
                  });
                } else {
                  autoSave();
                }


              } else {
                autoSave();
              }
            }, function (error) {
              notificationService.sendError('Unexpected template error: ' + error);
            });

          }

          // otherwise save normally
          else {
            sortRelationships();
            scope.computeRelationshipGroups();
            autoSave();
          }

          // recompute the domain attributes from MRCM service
          constraintService.getDomainAttributes(scope.concept, scope.branch).then(function (attributes) {
            scope.allowedAttributes = attributes;
          }, function (error) {
            notificationService.sendError('Error getting allowable domain attributes: ' + error);
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
          $rootScope.$broadcast('conceptEdit.c  onceptModified', {
            branch: scope.branch,
            conceptId: scope.concept.conceptId,
            concept: scope.concept
          });


          // store the modified concept in ui-state if autosave on
          if (scope.autosave === true) {
            scaService.saveModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId, scope.concept);
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

              // if template concept, reapply
              if (scope.template) {
                templateService.applyTemplateToConcept(scope.concept, scope.template);
              }

              // broadcast change event to edit.js for unsaved list update
              $rootScope.$broadcast('conceptEdit.conceptChange', {
                branch: scope.branch,
                conceptId: scope.concept.conceptId,
                concept: scope.concept
              });

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


        scope.$watch(scope.concept.relationships, function (newValue, oldValue) {

          // recompute the domain attributes from MRCM service
          constraintService.getDomainAttributes(scope.concept, scope.branch).then(function (attributes) {
            scope.allowedAttributes = attributes;
          }, function (error) {
            notificationService.sendError('Error getting allowable domain attributes: ' + error);
          });

          // compute the role groups
          scope.computeRelationshipGroups();
        }, true);


// pass constraint typeahead concept search function directly
        scope.getConceptsForValueTypeahead = constraintService.getConceptsForValueTypeahead;

//
// Relationship setter functions
//
        /**
         * Sets relationship type concept based on typeahead selection
         * @param relationshipField the type or target JSON object
         * @param conceptId the concept id
         * @param fsn the fsn
         */
        scope.setRelationshipTypeConcept = function (relationship, item, conceptId, relationshipGroupId, itemIndex) {
          if (!relationship || !item) {
            console.error('Cannot set relationship concept field, either field or item not specified');
          }

          relationship.type.conceptId = item.id;
          relationship.type.fsn = item.fsn.term;

          scope.updateRelationship(relationship, false);

          // Trigger blur event after relationship type has been selected
          var elemID = 'relationship-type-id-' + conceptId + '-' + relationshipGroupId + '-' + itemIndex;
          var elem = angular.element(document.querySelector('#' + elemID));         
          $timeout(function () {
            elem[0].blur();
            var parent = $(elem).closest('.editHeightSelector');
            if(parent.find("textarea").filter(function() { return this.value == ""; }).length > 0){
                parent.find("textarea").filter(function() { return this.value == ""; })[0].focus();                
            }
          }, 600); 
        };

        /**
         * Sets relationship target concept based on typeahead selection
         * @param relationshipField the type or target JSON object
         * @param conceptId the concept id
         * @param fsn the fsn
         */
        scope.setRelationshipTargetConcept = function (relationship, item, conceptId, relationshipGroupId, itemIndex) {
          if (!relationship || !item) {
            console.error('Cannot set relationship concept field, either field or item not specified');
          }            
          if (metadataService.isMrcmEnabled()) {
            if (!relationship.type.conceptId) {
              scope.warnings = ['MRCM validation error: Must set attribute type first'];
            } else {              
              constraintService.isValueAllowedForType(relationship.type.conceptId, item.id, scope.branch).then(function () {
                relationship.target.conceptId = item.id;
                relationship.target.fsn = item.fsn.term;
                relationship.target.definitionStatus = item.definitionStatus;
                if(scope.isBatch === true){             
                  scope.updateConceptReference({concept: scope.concept});
                }
                scope.updateRelationship(relationship);
              }, function () {
                scope.warnings = ['MRCM validation error: ' + item.fsn.term + ' is not a valid target for attribute type ' + relationship.type.fsn + '.'];
              });
            }
          } else {
            relationship.target.conceptId = item.id;
            relationship.target.fsn = item.fsn.term;
            relationship.target.definitionStatus = item.definitionStatus;
            if(scope.isBatch === true){             
              scope.updateConceptReference({concept: scope.concept});
            }
            scope.updateRelationship(relationship, false);
          }

          // Trigger blur event after relationship target has been selected
          var elemID = 'relationship-taget-id-' + conceptId + '-' + relationshipGroupId + '-' + itemIndex;
          var elem = angular.element(document.querySelector('#' + elemID));          
          $timeout(function () {
            elem[0].blur();
            var parent = $(elem).closest('.editHeightSelector');
            if(parent.find("textarea").filter(function() { return this.value == ""; }).length > 0){
                parent.find("textarea").filter(function() { return this.value == ""; })[0].focus();                
            }
          }, 600); 
        };

//////////////////////////////////////////////
// Component Removal functions
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

// TODO Make functional, styling overrides blocking -- template-field not currently defined
        scope.getTargetSlotStyle = function (relationship) {
          if (relationship && relationship.targetSlot && relationship.targetSlot.slotName) {
            return 'template-editable';
          }
          return '';
        };

        scope.getComponentStyle = function (id, field, defaultStyle, component) {

          // if dialect automation flag detected
          if (component && component.automationFlag && !scope.isBatch) {
            return 'tealhl';
          }          

          if (component && component.templateStyle) {
            return component.templateStyle;
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

        scope.$on('batchEditing.conceptChange', function (event, data) {
          console.debug('batchEditing.conceptChange', data);
          if (data.concept.conceptId === scope.concept.conceptId || data.concept.previousConceptId === scope.concept.conceptId) {
            scope.concept = data.concept;
            scope.isModified = data.isModified;
          }
        })

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
    }
      ;

  }
)
;

