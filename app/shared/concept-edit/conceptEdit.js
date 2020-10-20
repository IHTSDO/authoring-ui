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
})
.directive('typeahead', function ($timeout) {
  return {
    restrict: 'A',
    priority: 1000, // Let's ensure AngularUI Typeahead directive gets initialized first!
    link: function (scope, element, attrs) {
      // Bind keyboard events: arrows up(38) / down(40)
      element.bind('keydown', function (evt) {
        if (evt.which === 38 || evt.which === 40) {
          scope.$broadcast('TypeaheadActiveChanged', {'key' : evt.which});
        }
      });

      //compare function that treats the empty space as a match
      scope.emptyOrMatch = function (actual, expected) {
        if (expected === ' ') {
          return true;
        }
        var reg = new RegExp('.*' + expected.toLowerCase().split(' ').join('.*'),'i');       
        return actual ? reg.test(actual.toString().toLowerCase()) : false;
      };
      
      // Bind keyboard events, exclude : Delete and Backspace
      // If input matches an item of the list exactly, select it automatically.
      // Use typeahead-select-on-exact-with-ajax="true" along with typeahead directive when the suggestions come from server.
      // Use typeahead-select-on-exact-no-ajax="true" along with typeahead directive when the suggestions are existing in local.
      element.bind('keyup', function (evt) {  
        if (evt.which !== 8 && evt.which !== 46) {
          
          var selectFirstItem = function() {
            var elm = '[id*=option-0]';
            var opt = angular.element(document.querySelectorAll(elm));
      
            //call click handler outside of digest loop
            $timeout(function() {
              opt.triggerHandler('click');
            }, 0);
          };

          var selectOnExactWithAjax = attrs.typeaheadSelectOnExactWithAjax ? scope.$eval(attrs.typeaheadSelectOnExactWithAjax) : false;
          var typeaheadMinLength = attrs.typeaheadMinLength ? parseInt(attrs.typeaheadMinLength) : 0;
          if (selectOnExactWithAjax && element[0].value.length >= typeaheadMinLength) {
            var count = 0;
            var maxCount = 20;
            $timeout(function waitUntilTypeaheadTrigger() {
              count++;          
              if (scope[attrs.typeaheadLoading] ) {
                $timeout(function waitUntilTypeaheadOptionsVisible() {                  
                  if (!scope[attrs.typeaheadLoading]){
                    var typeaheadDropdown = $(element).next();
                    var children = $(typeaheadDropdown).children(); ;
                    if (children.length === 1){
                      selectFirstItem();
                    }              
                  }
                  else {
                    $timeout(waitUntilTypeaheadOptionsVisible, 100);
                  } 
              });
              }
              else {
                if (count <= maxCount){
                  $timeout(waitUntilTypeaheadTrigger,100);
                }                
              }                       
            }, 100);
          }
          
          var selectOnExactNoAjax = attrs.typeaheadSelectOnExactNoAjax ? scope.$eval(attrs.typeaheadSelectOnExactNoAjax) : false;
          if (selectOnExactNoAjax) {
            $timeout(function() {
              var typeaheadDropdown = $(element).next();
              var children = $(typeaheadDropdown).children(); ;
              if (children.length === 1){
                selectFirstItem();
              }                      
            }, 1200);
          }
        }        
      });
    }
  };
})
.directive('typeaheadPopup', function () {
  return {
    restrict: 'EA',
    link: function (scope, element, attrs) {
      var unregisterFn = scope.$on('TypeaheadActiveChanged', function (event, data) {
        if(scope.activeIdx !== -1) {
          // Retrieve active Typeahead option:
          var option = element.find('#' + attrs.id + '-option-' + scope.activeIdx);
          if(option.length) {
            var key =  data.key;

            // Make sure option is visible:
            var myElement = $(option[0]);
            var topPos = $(myElement)[0].offsetTop;
            var parent = $(myElement).closest("ul");
            var parentHeight = parent[0].clientHeight;
            var scrollPos = parent[0].scrollTop;

            if (key === 40) {
              if (topPos > parentHeight) {
                $(parent).scrollTop(topPos - parentHeight + 24);
              } else {
                $(parent).scrollTop(0);
              }
            } else {
              if (topPos < (scrollPos)) {
                $(parent).scrollTop(topPos);
              }
            }
          }
        }
      });

      // Ensure listener is unregistered when $destroy event is fired:
      scope.$on('$destroy', unregisterFn);
     }
  };
});

angular.module('singleConceptAuthoringApp').directive('conceptEdit', function ($rootScope, $timeout, $modal, $q, $interval, scaService, terminologyServerService, validationService, inactivationService, componentAuthoringUtil, notificationService, $routeParams, metadataService, crsService, constraintService, templateService, modalService, spellcheckService, ngTableParams, $filter, hotkeys, batchEditingService, $window, accountService, componentHighlightUtil) {
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

        // whether this display is part of the integrity Check view
        integrityCheckView: '@?',

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
        componentStyles: '=?',        

        inactiveDescriptions: '=',

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
        updateConceptReference: '&',

        // whether this directive is used in feedback view
        feedbackView: '@?',

        // indicate if user has permission to approve concept in review panel
        allowApproval: '=?',

        // whether to initially display project taxonomy
        projectTaxonomyVisible: '@?',

        loadValidation: '@?',

        // traceability that will be passed from Feedback
        traceabilities: '=?',

        highlightChanges: '@?',
        
        disableRemoveConcept: '=?'
      },
      templateUrl: 'shared/concept-edit/conceptEdit.html',

      link: function (scope, element, attrs, linkCtrl)
      {
        scope.initializationTimeStamp = (new Date()).getTime();
        // concept history for undoing changes (init with passed concept)
        scope.conceptHistory = [JSON.parse(JSON.stringify(scope.concept))];
        // concept history pointer (currently active state)
        scope.conceptHistoryPtr = 0;
        // allowable attributes for relationships
        scope.allowedAttributes = [];               
        scope.role = null;        
        scope.inactivateError = false;
        scope.saving = false;
        scope.templateInitialized = false;
        scope.showInferredRels = false;
        scope.dialectLength = null;
        scope.relationshipGroups = {};
        scope.extensionNamespace = '';
        scope.modelVisible = true;
        scope.totalTemplate = 0;

        // utility function pass-thrus        
        scope.isSctid = terminologyServerService.isSctid;
        scope.relationshipHasTargetSlot = templateService.relationshipHasTargetSlot;
        scope.relationshipInLogicalModel = templateService.relationshipInLogicalModel;
        scope.getSelectedTemplate = templateService.getSelectedTemplate;
        scope.isOptionalAttribute = templateService.isOptionalAttribute;
        scope.isExtensionSet = metadataService.isExtensionSet;
        scope.isLockedModule = metadataService.isLockedModule;
        scope.isExtensionDialect = metadataService.isExtensionDialect;
        scope.getExtensionMetadata = metadataService.getExtensionMetadata;       
        scope.getConceptsForValueTypeahead = constraintService.getConceptsForValueTypeahead;
        scope.crsFilter = crsService.crsFilter;

        var conceptsMap = {};        
        var inactivateConceptReasons = metadataService.getConceptInactivationReasons();
        var inactivateAssociationReasons = metadataService.getAssociationInactivationReasons();
        var inactivateDescriptionReasons = metadataService.getDescriptionInactivationReasons();
        var semanticTags = metadataService.getSemanticTags();

        //var inactivateDescriptionAssociationReasons = metadataService.getDescriptionAssociationInactivationReasons();
        var originalConceptId = null;
        var componentTerms = {};
        var axiomType = {
          'ADDITIONAL': 'additional',
          'GCI': 'gci'
        };                

        scope.descTypeIds = [
          {id: '900000000000003001', abbr: 'FSN', name: 'FSN'},
          {id: '900000000000013009', abbr: 'SYN', name: 'SYNONYM'},
          {id: '900000000000550004', abbr: 'DEF', name: 'TEXT_DEFINITION'}
        ];

        // define acceptability types
        scope.acceptabilityAbbrs = {
          'PREFERRED': 'P',
          'ACCEPTABLE': 'A'
        };

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

        if (scope.integrityCheckView === 'true' || scope.integrityCheckView === true) {
          scope.isIntegrityCheckView = true;
        } else {
          scope.isIntegrityCheckView = false;
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

        if (scope.feedbackView === 'true' || scope.feedbackView === true) {
          scope.isFeedback = true;
        } else {
          scope.isFeedback = false;
        }

        if (scope.showInactive === 'true' || scope.showInactive === true) {
          scope.hideInactive = false;
        } else {
          scope.hideInactive = true;
        }

        if (angular.isDefined(scope.additionalFields)) {
          scope.additionalFieldsDeclared = true;
        } else {
          scope.additionalFieldsDeclared = false;
        }

        if (scope.highlightChanges === 'true' || scope.highlightChanges === true) {
          scope.highlightChanges = true;
        } else {
          scope.highlightChanges = false;
        }

        if (scope.disableRemoveConcept === 'true' || scope.disableRemoveConcept === true) {
          scope.disableRemoveConcept = true;
        } else {
          scope.disableRemoveConcept = false;
        }
        
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

        scope.checkReadOnlyDialect = function(dialectId){
            let readOnly = metadataService.getReadOnlyDialectsForModuleId(scope.concept.moduleId);
            if(readOnly[dialectId] === 'true'){
                return true;
            }
            else{
                return false;
            }
        };

        scope.isGciAxiomPresent = function(conceptId) {
          if (conceptId) {
            let concept = conceptsMap[conceptId];
            return concept && concept.hasOwnProperty('gciAxioms') ? concept.gciAxioms.length !== 0 : false;
          }
          else {
            return (scope.concept.hasOwnProperty('gciAxioms') && scope.concept.definitionStatus !== 'FULLY_DEFINED') ? scope.concept.gciAxioms.length !== 0 : false;
          }          
        };

        function bulkRetrieveFullConceptForRelationships(destinationIds) {
          let filterd = destinationIds.filter(function(id) {
            return !conceptsMap.hasOwnProperty(id);
          })

          if (filterd.length === 0) {
            return;
          }

          // bulk call for concept ids
          terminologyServerService.bulkRetrieveFullConcept(filterd, scope.branch).then(function (concepts) {
            angular.forEach(concepts, function (concept) {
              conceptsMap[concept.conceptId] = concept;
            });         
          });
        }

        function bindShortcutToScope () {
          hotkeys.bindTo(scope)
            .add({
              combo: 'alt+s',
              description: 'Save current concept: ' + scope.concept.fsn,
              callback: function() {if(!scope.static && !scope.showInferredRels){scope.saveConcept()}}
            })
          hotkeys.bindTo(scope)
            .add({
              combo: 'alt+r',
              description: 'Add relationship to current concept: ' + scope.concept.fsn,
              callback: function() {
                if(!scope.static && !scope.isLockedModule(scope.concept.moduleId) && !scope.concept.template && !scope.showInferredRels){
                  let axiom = scope.concept.classAxioms[scope.concept.classAxioms.length - 1];
                  let relationship = axiom.relationships[axiom.relationships.length -1];
                  scope.addAxiomRelationship(relationship.groupId, relationship, axiom);
                }
              }
            })
          hotkeys.bindTo(scope)
            .add({
              combo: 'alt+d',
              description: 'Add description to current concept: ' + scope.concept.fsn,
              callback: function() {if(!scope.static && !scope.showInferredRels){scope.addDescription()}}
            })
          hotkeys.bindTo(scope)
            .add({
              combo: 'alt+g',
              description: 'Add role group to current concept: ' + scope.concept.fsn,
              callback: function() {
                if(!scope.static && !scope.isLockedModule(scope.concept.moduleId) && !scope.template && !scope.concept.template && !scope.showInferredRels){
                  let axiom = scope.concept.classAxioms[scope.concept.classAxioms.length - 1];
                  scope.addAxiomRelationshipGroup(axiom);
                }
              }
            })
          hotkeys.bindTo(scope)
            .add({
              combo: 'alt+x',
              description: 'Remove current concept from edit panel: ' + scope.concept.fsn,
              callback: function() {scope.removeConcept(scope.concept)}
            })
          hotkeys.bindTo(scope)
          .add({
            combo: 'alt+t',
            description: 'View Concept in taxonomy',
            callback: function() {
              $rootScope.$broadcast('viewTaxonomy', {
                concept: {
                  conceptId: scope.concept.conceptId,
                  fsn: scope.concept.fsn
                }
              })
            }
          })
          hotkeys.bindTo(scope)
          .add({
            combo: 'alt+q',
            description: 'Close all concepts',
            callback: function() {$rootScope.$broadcast('closeAllOpenningConcepts', {});}
          });

          if (!scope.allowApproval) {
            hotkeys.bindTo(scope)
            .add({
              combo: 'alt+a',
              description: 'Toggle display of active/inactive: ' + scope.concept.fsn,
              callback: function() {scope.toggleHideInactive()}
            });
          } else {
             hotkeys.bindTo(scope)
            .add({
              combo: 'alt+a',
              description: 'Approve concept: ' + scope.concept.fsn,
              callback: function() {
                scope.approveAndLoadNext();
              }
            });
          }
        }

        scope.focusHandler = function(enter, external){
            if(!scope.hasFocus && !scope.isMerge && enter){
              bindShortcutToScope();
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

        scope.templateTableParams = new ngTableParams({
        page: 1,
        count: 200,
        sorting: {name: 'asc'}
          },
          {
            filterDelay: 50,
            total: scope.templates ? scope.templates.length : 0, // length of data
            getData: function ($defer, params) {
                scope.totalTemplate = scope.templates.length;
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
            templateService.applyTemplateToExistingConcept(scope.concept, template, scope.branch).then(function(concept){
              scope.template = template;
              
              templateService.storeTemplateForConcept($routeParams.projectKey, scope.concept.conceptId, scope.template).then(function() {
                scope.concept = concept;
                let conceptId = scope.concept.conceptId; // keep conceptId (restore in timeout) and reset new id to fore UI reload state
                scope.concept.conceptId = terminologyServerService.createGuid();              
                scope.computeRelationshipGroups();
                sortDescriptions();
                sortRelationships();
                templateService.logTemplateConceptSave($routeParams.projectKey, conceptId, scope.concept.fsn, scope.template);
                
                $timeout(function () {
                  scope.concept.conceptId = conceptId;
                  autoSave();              
                }, 100);
              });
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

//////////////////////////////////////////////////////////////
// Handle additional fields, if required
/////////////////////////////////////////////////////////////

        
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

          if (!scope.concept || !scope.concept.relationships && !scope.concept.classAxioms && !scope.concept.gciAxioms) {
            return;
          }
         
          if(scope.concept.relationships){
              sortRelationshipArray(scope.concept.relationships);
          }
        }

        function sortRelationshipArray(relationships) {
          let isaRels = relationships.filter(function (rel) {
            return rel.type.conceptId === '116680003';
          });

          let attrRels = relationships.filter(function (rel) {
            return rel.type.conceptId !== '116680003';
          });

          // remove display flag if it's set, and set relationship type to null if concept id or fsn are not set
          angular.forEach(attrRels, function(rel){
              if (rel.display) delete rel.display;
              if (!rel.type.fsn || !rel.type.conceptId) rel.type.conceptId = null;
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
          relationships = isaRels.concat(attrRels);

          return relationships;
        }

        scope.isInactiveDescriptionModified = function (descriptionId) {
          return scope.inactiveDescriptions.hasOwnProperty(descriptionId);
        };        

        scope.collapse = function (concept) {
          if (scope.isCollapsed === true) {
            scope.isCollapsed = false;

            // id required, used in drawModel.js
            $('#image-' + concept.conceptId).css('display', 'inline-block');
            $('#project-taxonomy-' + concept.conceptId).css('display', 'inline-block');
            var zoomElm = $('#image-' + concept.conceptId).parent().parent().find('.zoom')[0];
            $(zoomElm).css('display', 'inline-block');
          }
          else {
            scope.isCollapsed = true;

            // id required, used in drawModel.js
            $('#image-' + concept.conceptId).css('display', 'none');
            $('#project-taxonomy-' + concept.conceptId).css('display', 'none');
            var zoomElm = $('#image-' + concept.conceptId).parent().parent().find('.zoom')[0];
            $(zoomElm).css('display', 'none');
          }

        };

        scope.toggleHideInactive = function () {
          scope.hideInactive = !scope.hideInactive;
          scope.computeRelationshipGroups();
        };
        
        scope.toggleInferredRelationships = function () {
           scope.showInferredRels = !scope.showInferredRels;
           scope.computeRelationshipGroups();
        };

        scope.toggleProjectTaxonomy = function () {
           scope.isProjectTaxonomyVisible = !scope.isProjectTaxonomyVisible;
           scope.$emit('viewProjectTaxonomy', {conceptId : scope.concept.conceptId, flag : scope.isProjectTaxonomyVisible});
           if (scope.isProjectTaxonomyVisible) {
              $rootScope.$broadcast('viewTaxonomy', {
              concept: {
                conceptId: scope.concept.conceptId,
                fsn: scope.concept.fsn
              }
            });
           }
        };

        scope.removeConcept = function (concept) {

          if (!terminologyServerService.isSctid(concept.conceptId)) {
            modalService.confirm('This concept is unsaved; removing it will destroy your work.  Continue?').then(function () {
              scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, concept.conceptId);
              $rootScope.$broadcast('stopEditing', {concept: concept});
            }, function () {
              // do nothing
            });

          } else if (scope.isModified && !scope.isStatic) {
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
        scope.validateConcept = function (concept) {
          if (concept.requiresValidation) {
            delete concept.requiresValidation;
          }
          var deferred = $q.defer();
          terminologyServerService.validateConcept($routeParams.projectKey, $routeParams.taskKey, concept).then(function (validationResults) {
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

            // clean the concept for terminology server-ready save
            terminologyServerService.cleanConcept(scope.concept);


            var saveFn = null;

            if (!scope.concept.conceptId || crsService.requiresCreation(scope.concept.conceptId)) {
              saveFn = terminologyServerService.createConcept;
            } else {
              saveFn = terminologyServerService.updateConcept;
            }


            // In order to ensure proper term-server behavior,
            // need to delete SCTIDs without effective time on descriptions and relationships
            // otherwise the values revert to termserver version
//            angular.forEach(scope.concept.descriptions, function (description) {
//              if (terminologyServerService.isSctid(description.descriptionId) && !description.effectiveTime && !description.released) {
//                delete description.descriptionId;
//              }
//            });
//            angular.forEach(scope.concept.relationships, function (relationship) {
//              if (terminologyServerService.isSctid(relationship.relationshipId) && !relationship.effectiveTime && !relationship.released) {
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
                  if (saveFn == terminologyServerService.createConcept) {
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

          var saveConceptFn = function() {
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

            errors = isMrcmAttributesValid(scope.concept);
            if (errors && errors.length > 0) {
              scope.errors = scope.errors ? scope.errors.concat(errors) : errors;
              return;
            }

            // clean concept of any locally added information
            // store original concept id for CRS integration
            var originalConcept = angular.copy(scope.concept);
            terminologyServerService.cleanConcept(scope.concept);

            scope.saving = true;

            // special case -- don't want save notifications in merge view, all
            // handling done in conflicts.js
            if (scope.merge) {
              notificationService.sendMessage('Saving accepted merged concept...');
            } else if (scope.isInactivation) {
              // do nothing
            } else {
              notificationService.sendMessage(scope.concept.conceptId ? 'Saving concept: ' + scope.concept.fsn : 'Saving new concept');
            }

            // validate concept first
            scope.validateConcept(scope.concept).then(function () {

              // special case -- merge:  display warnings and continue
              if (scope.merge) {
                $rootScope.$broadcast('acceptMerge', {
                  concept: scope.concept,
                  validationResults: scope.validation
                });

                if (Object.keys(scope.validation.errors).length > 0) {
                  scope.saving = false;
                  scope.concept = originalConcept
                }
              }

              // special case -- inactivation:  simply broadcast concept
              else if (scope.isInactivation) {

                if (scope.validation && scope.validation.hasErrors) {
                  notificationService.sendError('Fix errors before continuing');
                  scope.computeAxioms(axiomType.ADDITIONAL);
                  scope.computeAxioms(axiomType.GCI);
                  scope.reapplyTemplate();
                } else {
                  scope.saving = false;
                  scope.isModified = false;
                  $rootScope.$broadcast('saveInactivationEditing', {concept: scope.concept});
                }
              }

              // if errors, notify and do not save
              else if (scope.validation && scope.validation.hasErrors) {
                notificationService.sendError('Contradictions of conventions were detected. Please resolve Convention Errors before saving.');
                scope.saving = false;
                scope.computeAxioms(axiomType.ADDITIONAL);
                scope.computeAxioms(axiomType.GCI);
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
                  scope.validateConcept(scope.concept).then(function (results) {
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
                      if (scope.isIntegrityCheckView) {
                        if (scope.task.status === 'New') {
                          scaService.markTaskInProgress($routeParams.projectKey, $routeParams.taskKey);
                        }
                        $rootScope.$broadcast('loadNextConcept');
                        return;
                      }
                      
                      notificationService.sendWarning('Concept saved, but contradictions of conventions were detected. Please review Convention Warnings.');
                      $rootScope.$broadcast('conceptEdit.validation', {
                        branch: scope.branch,
                        conceptId: scope.concept.conceptId,
                        previousConceptId: originalConceptId,
                        concept: scope.concept,
                        validation: scope.validation
                      });
                    } else {
                      notificationService.sendMessage('Concept saved: ' + scope.concept.fsn, 5000);

                      if (scope.isIntegrityCheckView) {
                        if (scope.task.status === 'New') {
                          scaService.markTaskInProgress($routeParams.projectKey, $routeParams.taskKey);
                        }
                        $rootScope.$broadcast('loadNextConcept');
                        return;
                      }
                      scope.focusHandler(true, false);
                    }
                    scope.saving = false;
                    scope.reapplyTemplate();
                    scope.focusHandler(true, false);
                    scope.computeAxioms(axiomType.ADDITIONAL);
                    scope.computeAxioms(axiomType.GCI);
                    angular.forEach(scope.concept.classAxioms, function(axiom){
                        refreshAttributeTypesForAxiom(axiom);
                    })
                    angular.forEach(scope.concept.gciAxioms, function(axiom){
                        refreshAttributeTypesForAxiom(axiom);
                    })
                    updateReviewFeedback();

                    // reload the deleted components if any
                    if(scope.highlightChanges) {
                      loadDeletedComponents();
                    }
                  }, function (error) {
                    notificationService.sendError('Error: Concept saved with warnings, but could not retrieve convention validation warnings');
                    scope.saving = false;
                    scope.reapplyTemplate();
                    scope.computeAxioms(axiomType.ADDITIONAL);
                    scope.computeAxioms(axiomType.GCI);
                    angular.forEach(scope.concept.classAxioms, function(axiom){
                        refreshAttributeTypesForAxiom(axiom);
                    })
                    angular.forEach(scope.concept.gciAxioms, function(axiom){
                        refreshAttributeTypesForAxiom(axiom);
                    })
                    scope.focusHandler(true, false);
                  });
                }, 500);
              }, function (error) {
                if (error && error.status === 504) {

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
                  notificationService.sendError('Error saving concept: ' + error.data.message);
                  scope.focusHandler(true, false);
                }
                scope.reapplyTemplate();
                scope.saving = false;
                scope.focusHandler(true, false);
                scope.computeAxioms(axiomType.ADDITIONAL);
                scope.computeAxioms(axiomType.GCI);
                angular.forEach(scope.concept.classAxioms, function(axiom){
                    refreshAttributeTypesForAxiom(axiom);
                })
                angular.forEach(scope.concept.gciAxioms, function(axiom){
                    refreshAttributeTypesForAxiom(axiom);
                })
              });

            }, function (error) {
              notificationService.sendError('Fatal error: Could not validate concept');
              scope.reapplyTemplate();
              scope.saving = false;
              scope.focusHandler(true, false);
              scope.computeAxioms(axiomType.ADDITIONAL);
              scope.computeAxioms(axiomType.GCI);
              angular.forEach(scope.concept.classAxioms, function(axiom){
                  refreshAttributeTypesForAxiom(axiom);
              })
              angular.forEach(scope.concept.gciAxioms, function(axiom){
                  refreshAttributeTypesForAxiom(axiom);
              })
            });
          };

          // var promises = [];
          // angular.forEach(scope.concept.descriptions, function(description) {
          //   if (description.active && !description.effectiveTime && !description.released && description.type === 'SYNONYM') {
          //     promises.push(componentAuthoringUtil.runDescriptionAutomations(scope.concept, description, scope.template ? true : false));
          //   }
          // });
            
          // if (promises.length !== 0) {
          //   $q.all(promises).then(function () {
          //     saveConceptFn();
          //   });
          // }
          // else {
            saveConceptFn();
          // }          
        };

// Update feedback
        function updateReviewFeedback() {
          scaService.getUiStateForReviewTask($routeParams.projectKey, $routeParams.taskKey, 'reviewed-list').then(function (response) {
            if (response) {
              var reviewedListIds = response;
              for (var i = 0; i < reviewedListIds.length; i++) {
                if (scope.concept.conceptId === reviewedListIds[i]) {
                  var message = '<p>Modified since approval</p>';
                  var subjectConceptIds = [];
                  subjectConceptIds.push(scope.concept.conceptId);
                  scaService.addFeedbackToTaskReview($routeParams.projectKey, $routeParams.taskKey, message, subjectConceptIds, false);
                  scaService.markTaskReviewInProgress($routeParams.projectKey, $routeParams.taskKey);
                  reviewedListIds.splice(i,1);
                  break;
                }
              }
              scaService.saveUiStateForReviewTask($routeParams.projectKey, $routeParams.taskKey, 'reviewed-list', reviewedListIds) ;
            }
          });
        }

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
          if (!terminologyServerService.isConceptId(concept.conceptId)) {
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
            scope.warnings = ['Please remove any axiom relationships you would not like to create along with the concept, and/or fill the new Is A and click save.'];
            if (!scope.concept.relationships) {
              scope.concept.classAxioms = [];
              scope.addAdditionalAxiom(false);
              autoSave();
              scope.computeRelationshipGroups();
            }
            else {              
              if (scope.concept.effectiveTime) {
                scope.concept.classAxioms = [];
                
                var statedRels = [];
                angular.forEach(scope.concept.relationships, function (relationship) {
                  if (relationship.characteristicType === 'STATED_RELATIONSHIP') {
                    if(relationship.effectiveTime === scope.concept.effectiveTime){
                        let copy = angular.copy(relationship);
                        delete copy.relationshipId;
                        copy.active = true;
                        copy.released = false;
                        statedRels.push(copy);                        
                    }
                  }
                });

                if(statedRels.length === 0) {
                  scope.addAdditionalAxiom(false);
                }
                else {
                  scope.addAdditionalAxiom(true);
                  scope.concept.classAxioms[0].relationships = statedRels;
                }
              }
              else {
                angular.forEach(scope.concept.classAxioms, function (axiom) {
                  axiom.active = true;
                  angular.forEach(axiom.relationships, function (relationship) {
                    relationship.active = true;
                    relationship.released = false;
                  });
                });
              }

              autoSave();
              scope.computeRelationshipGroups();
            }

            scope.concept.active = true;

            scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId);

          }

          // otherwise, proceed with checks and inactivation reason persistence
          else {
            if (deletion) {
              scope.deletingConeceptError = false;
              if (isAttributeConcept(scope.concept.fsn)) {
                terminologyServerService.searchConcepts(scope.branch,'', '*: ' + scope.concept.conceptId + ' =*', 0, 50, false).then(function (results) {
                  if (results.total > 0) {
                    scope.deletingConeceptError = true;
                  } else {
                    deleteConcept();
                  }
                });
              } else {
                deleteConcept();
              }
            }
            else {
              // mimic actual inactivation
              var conceptCopy = angular.copy(scope.concept);
              conceptCopy.isLeafInferred = true;

              conceptCopy.active = false;
              angular.forEach(conceptCopy.relationships, function (relationship) {
                relationship.active = false;
              });

              // Check unpublished changes for concept
              if(scope.concept.released === true && hasUnpublishedChanges()) {
                scope.errors = ['This concept has unpublished changes, and therefore cannot be inactivated. Please revert these changes and try again.'];
                return;
              }

              scope.inactivatingConceptError = false;
              if (isAttributeConcept(conceptCopy.fsn)) {
                terminologyServerService.searchConcepts(scope.branch,'', '*: ' + conceptCopy.conceptId + ' =*', 0, 50, false).then(function (results) {
                  if (results.total > 0) {
                    scope.inactivatingConceptError = true;
                  } else {
                    inactivateConcept(conceptCopy);
                  }
                });
              } else {
                inactivateConcept(conceptCopy);
              }
            }
          }
        };

        function deleteConcept () {
          selectInactivationReason('Concept', inactivateConceptReasons, inactivateAssociationReasons, scope.concept.conceptId, scope.concept, scope.branch, true).then(function (results) {
            inactivationService.setParameters(scope.branch, scope.concept, null, results.associationTarget);
            if (results.deletion && !results.associationTarget) {
              notificationService.sendMessage('Deleting Concept...');
              terminologyServerService.deleteConcept(scope.concept.conceptId, scope.branch).then(function (response) {
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

        function inactivateConcept (conceptCopy) {
          // validate the concept
          terminologyServerService.validateConcept($routeParams.projectKey, $routeParams.taskKey, conceptCopy).then(function (validationResults) {
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
              inactivationService.setParameters(scope.branch, scope.concept, results.reason.id, results.associationTarget, false, results.useFirstTarget);
              $rootScope.$broadcast('conceptEdit.inactivateConcept');
            });
          });
        }

        scope.searchRelevantConcepts = function() {
          $rootScope.$broadcast('viewSearch', {
            conceptId: scope.concept.conceptId,
            eclMode: true
          });
        }

        function isAttributeConcept (fsn) {
          if (!fsn) {
            return false;
          }
          var patt = new RegExp("(attribute)");
          return patt.test(fsn);
        }

        function hasUnpublishedChanges() {
          let hasUnpublishedDescriptions = false;
          scope.concept.descriptions.forEach(function (item) {
            if(!item.released || (item.released && typeof item.effectiveTime === 'undefined')) {
              hasUnpublishedDescriptions = true;
              item.templateStyle = 'redhl';
            } else {
              item.templateStyle = null;;
            }
          });

          let hasUnpublishedRelationships = false;
          scope.concept.relationships.forEach(function (item) {
            if(item.characteristicType !== 'INFERRED_RELATIONSHIP'
              && (!item.released || (item.released && typeof item.effectiveTime === 'undefined'))) {
              hasUnpublishedRelationships = true;
              item.templateStyle = 'redhl';
            } else {
              item.templateStyle = null;
            }
          });

          let hasUnpublishedClassAxioms = hasUnpublishedAxiomChanges(scope.concept.classAxioms);

          let hasUnpublishedGCIs = hasUnpublishedAxiomChanges(scope.concept.gciAxioms);

          return hasUnpublishedDescriptions || hasUnpublishedRelationships || hasUnpublishedClassAxioms || hasUnpublishedGCIs;
        }

        function hasUnpublishedAxiomChanges (axioms) {
          let hasUnpublishedChanges = false;
          if (axioms && axioms.length > 0) {
            axioms.forEach(function (axiom) {
              var flag = axiom.released === true && axiom.active === true && (!axiom.effectiveTime || axiom.effectiveTime === null);
              if (flag) {
                axiom.templateStyle = 'redhl';
                hasUnpublishedChanges = true;
              }
            });
          }

          return hasUnpublishedChanges;
        }
        /**
         * Function to mark concept as approval and load next concept in editor
         */
        scope.approveAndLoadNext = function() {
          scope.$emit('approveAndLoadNext', scope.concept);
        };

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

        scope.toggleAxiomDefinitionStatus = function (axiom) {
          if (!scope.isStatic) {
            if (axiom.definitionStatus === 'FULLY_DEFINED') {
              axiom.definitionStatus = 'PRIMITIVE';
            }
            else {
              axiom.definitionStatus = 'FULLY_DEFINED';
            }
            autoSave();
          }
        };

// function to apply cascade changes when concept module id changes
        scope.setConceptModule = function (concept) {
          angular.forEach(scope.concept.descriptions, function (description) {
            description.moduleId = concept.moduleId;
          });
          /*
          angular.forEach(scope.concept.relationships, function (relationship) {
            relationship.moduleId = concept.moduleId;
          });
          */

          if (scope.concept.classAxioms) {
            angular.forEach(scope.concept.classAxioms, function (axiom) {
              axiom.moduleId = concept.moduleId;
              angular.forEach(axiom.relationships, function(relationship){
                relationship.moduleId = concept.moduleId;
              });
            });
          }
          
          if (scope.concept.gciAxioms) {
            angular.forEach(scope.concept.gciAxioms, function (axiom) {
              axiom.moduleId = concept.moduleId;
              angular.forEach(axiom.relationships, function(relationship){
                relationship.moduleId = concept.moduleId;
              });
            });
          }

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

// on extension metadata set
        scope.$on('setExtensionMetadata', function (event, data) {
          scope.dialects = metadataService.getAllDialects();
        });


// function to retrieve branch dialect ids as array instead of map
// NOTE: Required for orderBy in ng-repeat       
        scope.getDialectIdsForDescription = function (description, FSN) {
          let dialectLength = 0;
          let dialects = metadataService.getDialectsForModuleId(description.moduleId, FSN);
          angular.forEach(scope.getAvailableLanguages(description.moduleId), function(language){
              let count = 0;
              angular.forEach(dialects, function(dialect){
                  if(dialect.indexOf(language) > -1)
                      {
                          count++
                          if(count > dialectLength){
                              dialectLength = count;
                          }
                      }
              })
          });
          if(dialectLength > scope.dialectLength){
            scope.dialectLength = dialectLength;
          }

          return Object.keys(dialects);
        };

        scope.getDialectsForDescription = function (description, FSN) {
          return metadataService.getDialectsForModuleId(description.moduleId, FSN);
        };

        scope.filterDescriptions = function (d) {
          return !scope.hideInactive || d.active;
        };                

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
          angular.forEach(scope.concept.classAxioms, function (axiom) {
            if(!axiom.moduleId) {
              axiom.moduleId = moduleId;
            }
            angular.forEach(axiom.relationships, function (relationship) {
              if(!relationship.moduleId) {
                relationship.moduleId = moduleId;
              }              
            });
          });
          angular.forEach(scope.concept.gciAxioms, function (axiom) {
            if(!axiom.moduleId) {
              axiom.moduleId = moduleId;
            }
            angular.forEach(axiom.relationships, function (relationship) {
              if(!relationship.moduleId) {
                relationship.moduleId = moduleId;
              }              
            });
          });          
        }

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
            var dialects = metadataService.getDialectsForModuleId(moduleId);
            angular.forEach(metadataService.getDefaultLanguageForModuleId(moduleId), function(language){
                description = componentAuthoringUtil.getNewDescription(moduleId, language);

                let matchingDialects = [];
                for (var key in dialects) {
                  if (dialects[key].indexOf(language) !== -1) {
                    matchingDialects.push(key);
                  }
                }

                angular.forEach(matchingDialects, function(dialect){
                    var havingPreferredSynonym = scope.concept.descriptions.filter(function (item) {
                        return item.active && item.acceptabilityMap[dialect] === 'PREFERRED' && item.type === 'SYNONYM';
                      }).length > 0;

                    if(havingPreferredSynonym) {
                      if(metadataService.getDialectDefaultsForModuleId(moduleId)[dialect] !== "false"){
                          description.acceptabilityMap[dialect] = 'ACCEPTABLE';
                      }
                    }
                });

                if (afterIndex === null || afterIndex === undefined) {
                  scope.concept.descriptions.push(description);
                  autoSave();
                }
                // if in range, add after the specified afterIndex
                else {
                  scope.concept.descriptions.splice(afterIndex + 1, 0, description);
                  afterIndex++;
                  autoSave();
                }
            })
          } else {
            description = componentAuthoringUtil.getNewDescription(metadataService.isExtensionSet() ? moduleId : scope.concept.moduleId);

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

        scope.removeAxiom = function (axiom, type) {
          var msg = '';
          if(scope.concept.classAxioms.length < 2 && type === axiomType.ADDITIONAL) {
            msg = 'You may not remove the last axiom. Please go back to editing.';
            modalService.message(msg);
          }
          else{
            if(scope.concept.classAxioms.length >= 2 && type === axiomType.ADDITIONAL) {
              msg = 'Do you want to remove this Axiom ?';
            }
            else if(type === axiomType.GCI) {
              msg = 'Do you want to remove this General Concept Inclusion Axiom ?';
            }
            modalService.confirm(msg).then(function () {
              if(scope.concept.classAxioms.length >= 2 || type === axiomType.GCI){
                var index = -1;
                  if (type === axiomType.ADDITIONAL) {
                    for (var i = scope.concept.classAxioms.length - 1; i >= 0; i--) {
                      if (axiom.axiomId === scope.concept.classAxioms[i].axiomId) {
                        index = i;
                        break;
                      }
                    }
                    if (index >= 0) {
                      scope.concept.classAxioms.splice(index, 1);
                      scope.computeAxioms(type);
                      autoSave();
                    }
                  } else if (type === axiomType.GCI) {
                    for (var i = scope.concept.gciAxioms.length - 1; i >= 0; i--) {
                      if (axiom.axiomId === scope.concept.gciAxioms[i].axiomId) {
                        index = i;
                        break;
                      }
                    }
                    if (index >= 0) {
                      scope.concept.gciAxioms.splice(index, 1);
                      scope.computeAxioms(type);
                      autoSave();
                    }
                  }
                }

              }, function () {
                // do nothing
              }
            );
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

            // Force newly active descriptions to be ACCEPTABLE by default
            let dialectIds = scope.getDialectIdsForDescription(description);
            angular.forEach(dialectIds, function (diaId) {
              description.acceptabilityMap[diaId] = 'ACCEPTABLE';
            });

            if (description.type === 'FSN') {
              description.acceptabilityMap = componentAuthoringUtil.getNewAcceptabilityMap(description.moduleId, 'PREFERRED');
            }

            if (metadataService.isExtensionSet()) {
              if (description.type === 'FSN') {
                angular.forEach(Object.keys(description.acceptabilityMap), function (dialectId) {
                  if (!metadataService.isUsDialect(dialectId)) {
                    delete description.acceptabilityMap[dialectId];
                  }
                });
              } else {

                // Strip out US, GB dialects
                delete description.acceptabilityMap['900000000000509007'];
                delete description.acceptabilityMap['900000000000508004'];
              }
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
//                  terminologyServerService.inactivateDescription(scope.branch, description.descriptionId, results.reason.id).then(function (response) {
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
//            terminologyServerService.inactivateDescription(scope.branch, item.descriptionId, results.reason.id).then(function (response) {
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

            terminologyServerService.inactivateConcept(scope.branch, scope.concept.conceptId, results.reason.id, results.associationTarget).then(function () {

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

                // To make sure that there is no redundant acceptability map for extension (In some cases, the Map could contain an additional acceptability map for en-GB -> remove it)
                if (metadataService.isExtensionSet() && description.acceptabilityMap.hasOwnProperty('900000000000508004') && !description.released) {
                  delete description.acceptabilityMap['900000000000508004'];
                }

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
          return scope.dialects[id].substring(scope.dialects[id].indexOf("-") + 1);
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
        scope.filterRelationships = function (rel) {
          return !scope.hideInactive || rel.active;
        };

        scope.filterAxiomRelationships = function (rel) {
          return !scope.hideInactive || rel.active;
        };

        scope.showRelationshipGroup = function (relGroup) {

          if (!scope.hideInactive && scope.showInferredRels) {
            return true;
          }
          var activeRels = relGroup.filter(function (item) {
            return item.active;
          });
          return activeRels.length > 0;
        };

        scope.showAxiomRelationshipGroup = function (relGroup) {

          if (!scope.hideInactive) {
            return true;
          }
          var activeRels = relGroup.filter(function (item) {
            return item.active;
          });
          return activeRels.length > 0;
        };

// function compute the inferred relationship groups
        scope.computeRelationshipGroups = function () {

          // sort relationships to ensure proper sorting
          // sort relationships to ensure proper sorting
          // sortRelationships();

          // clear the relationship groups
          scope.relationshipGroups = {};

          angular.forEach(scope.concept.relationships, function (rel) {
            let flag = false;
            if ((scope.showInferredRels &&  rel.characteristicType === 'INFERRED_RELATIONSHIP')
              || (!scope.showInferredRels && rel.characteristicType === 'STATED_RELATIONSHIP')) {
              flag = true;
            }
            if (flag) {
              // if map does not have this group id, add blank array
              if (!scope.relationshipGroups.hasOwnProperty(parseInt(rel.groupId))) {
                scope.relationshipGroups[parseInt(rel.groupId)] = [];
              }

              // push this relationship onto group-mapped array
              scope.relationshipGroups[parseInt(rel.groupId)].push(rel);

              // sort inferred relations
              scope.relationshipGroups[parseInt(rel.groupId)] = sortRelationshipArray(scope.relationshipGroups[parseInt(rel.groupId)]);
            }
          });
        };


        scope.computeAxioms = function(type) {
          if (!type) {
            return;
          }

          if (type === axiomType.ADDITIONAL) {
            angular.forEach(scope.concept.classAxioms, function (axiom) {
              axiom['relationshipGroups'] = {};
              axiom.title = 'Axiom';
              axiom.type = axiomType.ADDITIONAL;
              angular.forEach(axiom.relationships, function (rel) {
                rel.id = axiom.axiomId + '_' + rel.groupId + '_' + rel.type.conceptId + '_' + rel.target.conceptId;

                // if map does not have this group id, add blank array
                if (!axiom.relationshipGroups.hasOwnProperty(' ' + parseInt(rel.groupId))) {
                  axiom.relationshipGroups[' ' + parseInt(rel.groupId)] = [];
                }

                // push this relationship onto group-mapped array
                axiom.relationshipGroups[' ' + parseInt(rel.groupId)].push(rel);               
              });
            });
          }

          if(type === axiomType.GCI) {
            angular.forEach(scope.concept.gciAxioms, function (axiom) {
              axiom['relationshipGroups'] = {};
              axiom.title = 'General Concept Inclusion';
              axiom.type = axiomType.GCI;
              angular.forEach(axiom.relationships, function (rel) {
                rel.id = axiom.axiomId + '_' + rel.groupId + '_' + rel.type.conceptId + '_' + rel.target.conceptId;
                // if map does not have this group id, add blank array
                if (!axiom.relationshipGroups.hasOwnProperty(' ' + parseInt(rel.groupId))) {
                  axiom.relationshipGroups[' ' + parseInt(rel.groupId)] = [];
                }

                // push this relationship onto group-mapped array
                axiom.relationshipGroups[' ' +  parseInt(rel.groupId)].push(rel);
              });
            });
          }

        };

        scope.addRelationship = function (relGroup, relationshipBefore) {

          var relationship = componentAuthoringUtil.getNewAttributeRelationship(metadataService.isExtensionSet() ? null : scope.concept.moduleId);

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

          // Binding mouse scroll event
          $timeout(function () {
            registerMouseScrollEvent();
          }, 1000);
        };

        scope.addAxiomRelationship = function (relGroup, relationshipBefore, axiom) {

          var relationship = componentAuthoringUtil.getNewAttributeRelationship(null);

           // Remove unused properties
          delete relationship.characteristicType;
          delete relationship.effectiveTime;
          delete relationship.modifier;
          delete relationship.moduleId;

          relationship.sourceId = scope.concept.conceptId;

          // set role group if specified
          if (relGroup) {
            relationship.groupId = relGroup;

          }
          var index = axiom.relationships.indexOf(relationshipBefore);
          if (index === -1) {
            axiom.relationships.push(relationship);
          } else {
            axiom.relationships.splice(index + 1, 0, relationship);
          }
          refreshAttributeTypesForAxiom(axiom);

          scope.computeAxioms(axiom.type);
          autoSave();
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
          if(scope.template || scope.concept.template) {
            templateService.replaceLexicalValues(scope.concept, scope.template ? scope.template : scope.concept.template, scope.branch).then(function(concept) {
              scope.concept = concept;
              scope.computeRelationshipGroups();
            });
          } else {
            scope.computeRelationshipGroups();
          }
        };

        scope.removeAxiomRelationship = function (relationship, axiom) {
          var index = axiom.relationships.indexOf(relationship);
          if (index !== -1) {
            axiom.relationships.splice(index, 1);
            if (axiom.relationships.length === 0) {
              var isaRel = componentAuthoringUtil.getNewIsaRelationship();
              // Remove unused properties
              delete isaRel.active;
              delete isaRel.characteristicType;
              delete isaRel.effectiveTime;
              delete isaRel.modifier;
              delete isaRel.moduleId;

              isaRel.sourceId = scope.concept.conceptId;
              refreshAttributeTypesForAxiom(axiom);

              axiom.relationships.push(isaRel);
            }
            if(scope.template || scope.concept.template) {
              templateService.replaceLexicalValues(scope.concept, scope.template ? scope.template : scope.concept.template, scope.branch).then(function(concept) {
                scope.concept = concept;
                scope.computeAxioms(axiom.type);
                autoSave();
              });
            } else {
              scope.computeAxioms(axiom.type);
              autoSave();
            }
          } else {
            console.error('Error removing axiom relationship; relationship not found');
            scope.computeAxioms(axiom.type);
            autoSave();
          }          
        };

        scope.toggleAxiomActive = function (axiom) {
          if (scope.concept.active === true) {
            if(axiom.released === true && axiom.active === true && !axiom.effectiveTime || axiom.released === true && axiom.active === true && axiom.effectiveTime === null) {
              scope.errors = ['This axiom has unpublished changes, and therefore cannot be inactivated. Please revert these changes and try again.'];
              return;
            }
            else{
              axiom.active = !axiom.active;
              axiom.effectiveTime = null;
              componentAuthoringUtil.applyMinimumFields(scope.concept);
              autoSave();
            }
          }
          else {
            scope.warnings = ['You must activate the concept before its components.'];
          }
        }

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

        scope.addAdditionalAxiom = function(blank) {
          var axiom = componentAuthoringUtil.getNewAxiom(blank);
          if (!terminologyServerService.isSctid(scope.concept.conceptId)) {
            axiom.axiomId = null;
          }
          if(axiom.relationships.length > 0){
            axiom.relationships[0].sourceId = scope.concept.conceptId;
          }

          if(!scope.concept.hasOwnProperty('classAxioms')){
            scope.concept.classAxioms = [];
          }

          scope.concept.classAxioms.push(axiom);
          refreshAttributeTypesForAxiom(axiom)
          scope.computeAxioms(axiomType.ADDITIONAL);
          autoSave();
        };

        scope.addGCIAxiom = function() {
          var axiom = componentAuthoringUtil.getNewAxiom();
          if (!terminologyServerService.isSctid(scope.concept.conceptId)) {
            axiom.axiomId = null;
          }
          axiom.relationships[0].sourceId = scope.concept.conceptId;

          if(!scope.concept.hasOwnProperty('gciAxioms')){
            scope.concept.gciAxioms = [];
          }

          scope.concept.gciAxioms.push(axiom);
          refreshAttributeTypesForAxiom(axiom)
          scope.computeAxioms(axiomType.GCI);
          autoSave();
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

        scope.getConceptIdNameTripleFromAttributeType = function (relationship) {
          return {
            id: relationship.type.conceptId,
            fsn: relationship.type.fsn,
            pt: relationship.type.pt
          };
        };

        scope.dropRelationshipTarget = function (relationship, data) {

          if(data.concept) {
            data.id = data.concept.conceptId;
            data.name = data.concept.fsn ? data.concept.fsn : data.concept.preferredSynonym;
          }

          // cancel if static
          if (scope.isStatic) {
            return;
          }

          // cancel if template applied and this is not a valid target slot
          if (scope.template && relationship.targetSlot && !relationship.targetSlot.slotName) {
            return;
          }

          if(scope.template && relationship.target && relationship.target.conceptId && !relationship.targetSlot) {
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

              if(!metadataService.isExtensionSet()
                && relationship.type.conceptId === '116680003') {// Is a (attribute)
                terminologyServerService.getFullConcept(data.id, scope.branch).then(function(response) {
                  if (relationship.moduleId !== response.moduleId) {
                    resetModuleId(response.moduleId);
                  }
                  scope.updateRelationship(relationship, false);
                });
              } else {
                scope.updateRelationship(relationship, false);
              }
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

                if(!metadataService.isExtensionSet()
                  && relationship.type.conceptId === '116680003') {// Is a (attribute)
                  terminologyServerService.getFullConcept(data.id, scope.branch).then(function(response) {
                    if (relationship.moduleId !== response.moduleId) {
                      resetModuleId(response.moduleId);
                    }
                    scope.updateRelationship(relationship, false);
                  });
                } else {
                  scope.updateRelationship(relationship, false);
                }
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

            if(!metadataService.isExtensionSet()
              && relationship.type.conceptId === '116680003') {// Is a (attribute)
              terminologyServerService.getFullConcept(data.id, scope.branch).then(function(response) {
                if (relationship.moduleId !== response.moduleId) {
                  resetModuleId(response.moduleId);
                }
                scope.updateRelationship(relationship, false);
              });
            } else {
              scope.updateRelationship(relationship, false);
            }
          }
        };

        scope.dropAxiomRelationshipTarget = function (relationship, data, type, axiom) {

          if(data.concept) {
            data.id = data.concept.conceptId;
            data.name = data.concept.fsn ? data.concept.fsn : data.concept.preferredSynonym;
          }

          // cancel if static
          if (scope.isStatic) {
            return;
          }

          var tempFsn = relationship.target.fsn;

          relationship.target.fsn = 'Validating...';
            
          // if template supplied, check ECL/ESCG
          if (scope.template) {
            if (!relationship.template || !relationship.template.targetSlot) {
              relationship.target.fsn = tempFsn;
              return;
            }
            constraintService.isValueAllowedForType(relationship.type.conceptId, data.id, scope.branch,
              relationship.template && relationship.template.targetSlot ? relationship.template.targetSlot.allowableRangeECL : null).then(function () {
              relationship.target.conceptId = data.id;
              relationship.target.fsn = data.name;

              let destinationIds = [];
              destinationIds.push(relationship.target.conceptId);
              bulkRetrieveFullConceptForRelationships(destinationIds);

              if(!metadataService.isExtensionSet()
                && relationship.type.conceptId === '116680003') {// Is a (attribute)
                terminologyServerService.getFullConcept(data.id, scope.branch).then(function(response) {
                  if (relationship.moduleId !== response.moduleId) {
                    resetModuleId(response.moduleId);
                  }
                  scope.updateRelationship(relationship, false);
                  scope.isModified = true;
                  scope.computeAxioms(type);
                  refreshAttributeTypesForAxiom(axiom);
                  autoSave();
                });
              } else {
                scope.updateRelationship(relationship, false);
              }
            }, function (error) {
              scope.warnings = ['Concept ' + data.id + ' |' + data.name + '| not in target slot allowable range: ' + relationship.template.targetSlot.allowableRangeECL];
              relationship.target.fsn = tempFsn;
            });
          }

          else if (metadataService.isMrcmEnabled()) {

            if (relationship.type.conceptId) {

              constraintService.isValueAllowedForType(relationship.type.conceptId, data.id, scope.branch).then(function () {
                terminologyServerService.getFullConcept(data.id, scope.branch).then(function (response) {
                  relationship.target.conceptId = response.conceptId;
                  relationship.target.fsn = response.fsn;
                  relationship.target.definitionStatus = response.definitionStatus;
                  relationship.target.effectiveTime = response.effectiveTime;
                  relationship.target.moduleId = response.moduleId;
                  relationship.target.active= response.active;
                  relationship.target.released = response.released;

                  let destinationIds = [];
                  destinationIds.push(relationship.target.conceptId);
                  bulkRetrieveFullConceptForRelationships(destinationIds);

                  scope.isModified = true;
                  scope.computeAxioms(type);
                  refreshAttributeTypesForAxiom(axiom);
                  autoSave();
                });
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
            terminologyServerService.getFullConcept(data.id, scope.branch).then(function (response) {
              relationship.target.conceptId = response.conceptId;
              relationship.target.fsn = response.fsn;
              relationship.target.definitionStatus = response.definitionStatus;
              relationship.target.effectiveTime = response.effectiveTime;
              relationship.target.moduleId = response.moduleId;
              relationship.target.active= response.active;
              relationship.target.released = response.released;

              scope.computeAxioms(type);
              autoSave();
            });
          }
        };

        scope.dropRelationshipType = function (relationship, data) {

          if(data.concept) {
            data.id = data.concept.conceptId;
            data.name = data.concept.fsn ? data.concept.fsn : data.concept.preferredSynonym;
          }

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
              relationship.type.fsn = data.fsn;

              scope.updateRelationship(relationship, false);
            } else {
              scope.warnings = ['MRCM validation error: ' + data.fsn + ' is not a valid attribute.'];
            }
          } else {
            relationship.type.conceptId = data.id;
            relationship.type.fsn = data.fsn;
          }
        };

        scope.dropAxiomRelationshipType = function (relationship, data, axiom) {
            console.log(data);

          if(data.concept) {
            data.id = data.concept.conceptId;
            data.pt = data.concept.preferredSynonym;
            data.fsn = data.concept.fsn;
          }

          // cancel if static
          if (scope.isStatic) {
            return;
          }

          // check that attribute is acceptable for MRCM rules
          if (metadataService.isMrcmEnabled()) {

            // check attribute allowed against stored array
            if (constraintService.isAttributeAllowedForArray(data.id, axiom.allowedAttributes)) {

              // if target already specified, validate it
              if (relationship.target.conceptId) {
                constraintService.isValueAllowedForType(data.id, relationship.target.conceptId, scope.concept, scope.branch).then(function () {
                  // do nothing
                }, function (error) {
                  scope.warnings = ['MRCM validation error: ' + relationship.target.pt + ' is not a valid target for attribute type ' + data.name + '.'];
                });
              }

              relationship.type.conceptId = data.id;
              relationship.type.pt = data.pt;
              relationship.type.fsn = data.fsn;
              scope.isModified = true;

              scope.computeAxioms(axiom.type);
              autoSave();
            } else {
              scope.warnings = ['MRCM validation error: ' + data.fsn + ' is not a valid attribute.'];
            }
          } else {
            relationship.type.conceptId = data.id;
            relationship.type.pt = data.pt;
            relationship.type.fsn = data.fsn;
            scope.computeAxioms(axiom.type);
            autoSave();
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
          copy.conceptId = null; // re-added by terminology server

          //remove release flag if any
          if(copy.released) {
            delete copy.released
          }

          // reset module id
          copy.moduleId = metadataService.isExtensionSet()? metadataService.getCurrentModuleId() : scope.concept.moduleId;

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

          if (!source.active) {
            console.error('Source is not active, cannot drop');
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
              copy.moduleId = metadataService.isExtensionSet()? metadataService.getCurrentModuleId() : scope.concept.moduleId;

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

        scope.dropAxiom = function (source) {
          if (!source) {
            console.error('Cannot drop axiom, source not specified');
            return;
          }

          // check if target is static
          if (scope.isStatic) {
            console.error('Scope is static, cannot drop');
            return;
          }
          if (scope.concept.conceptId === source.relationships[0].sourceId) {
            return;
          }

          let axiom = angular.copy(source);
          axiom.axiomId = null;
          axiom.active = true;
          axiom.released = false;
          axiom.moduleId = metadataService.isExtensionSet()? metadataService.getCurrentModuleId() : scope.concept.moduleId;
          delete axiom.effectiveTime;
          delete axiom.id;
          if (axiom.type === axiomType.ADDITIONAL) {
            if(!scope.concept.hasOwnProperty('classAxioms')){
              scope.concept.classAxioms = [];
            }
            let destinationIds = [];
            axiom.relationships.forEach(function (rel) {
              rel.sourceId = scope.concept.conceptId;
              rel.active = true;
              rel.released = false;
              rel.moduleId = axiom.moduleId;
              destinationIds.push(rel.target.conceptId);
            });
            bulkRetrieveFullConceptForRelationships(destinationIds);
            scope.concept.classAxioms.push(axiom);
            scope.computeAxioms(axiomType.ADDITIONAL);
          } else {
            if(!scope.concept.hasOwnProperty('gciAxioms')){
              scope.concept.gciAxioms = [];
            }
            let destinationIds = [];
            axiom.relationships.forEach(function (rel) {
              rel.sourceId = scope.concept.conceptId;
              rel.active = true;
              rel.released = false;
              rel.moduleId = axiom.moduleId;
              destinationIds.push(rel.target.conceptId);
            });
            bulkRetrieveFullConceptForRelationships(destinationIds);
            scope.concept.gciAxioms.push(axiom);
            scope.computeAxioms(axiomType.GCI);
          }
          autoSave();;
        };

        scope.dropAxiomRelationship = function (target, source, axiom) {
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

          if (constraintService.isAttributeAllowedForArray(source.type.conceptId, axiom.allowedAttributes)) {

            constraintService.isValueAllowedForType(source.type.conceptId, source.target.conceptId, scope.branch).then(function () {
              // copy relationship object and replace target relationship
              var copy = angular.copy(source);


              // set sourceId from current concept
              copy.sourceId = scope.concept.conceptId;

              // set module Id
              copy.moduleId = metadataService.isExtensionSet()? metadataService.getCurrentModuleId() : scope.concept.moduleId;

              // set the group based on target
              copy.groupId = (metadataService.isUngroupedAttribute(source.type.conceptId) || source.type.conceptId === '116680003') ? 0 : target.groupId;

              // get index of target relationship
              var targetIndex = axiom.relationships.indexOf(target);

              // if existing relationship, insert source relationship afterwards
              if (target.target.conceptId) {
                axiom.relationships.splice(targetIndex + 1, 0, copy);
              }

              // otherwise replace the relationship
              else {
                axiom.relationships[targetIndex] = copy;
              }
              let destinationIds = [];
              destinationIds.push(copy.target.conceptId);
              bulkRetrieveFullConceptForRelationships(destinationIds);

              refreshAttributeTypesForAxiom(axiom);
              scope.computeAxioms(axiom.type);
              autoSave();
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

          // set focus on new first created relationship type of group.
          $timeout(function () {
            var newFirstCreatedElmId = 'relationship-type-id-' + scope.concept.conceptId + '-' + rel.groupId + '-0';
            var newFirstCreatedElm = angular.element(document.querySelector('#' + newFirstCreatedElmId));
            newFirstCreatedElm.focus();
          }, 500);

          // Binding mouse scroll event
          $timeout(function () {
            registerMouseScrollEvent();
          }, 1000);
        };

        scope.addAxiomRelationshipGroup = function (axiom) {
          var groupIds = [];
          axiom.relationships.forEach(function (rel) {
            groupIds.push(parseInt(rel.groupId));
          });

          // push two new relationships
          var rel = componentAuthoringUtil.getNewAttributeRelationship();

          // Remove unused properties
          delete rel.characteristicType;
          delete rel.effectiveTime;
          delete rel.modifier;
          delete rel.moduleId;

          rel.groupId = Math.max.apply(null, groupIds) + 1;
          rel.sourceId = scope.concept.conceptId;

          axiom.relationships.push(rel);
          axiom.relationships.push(angular.copy(rel));

          // recompute relationship groups
          scope.computeAxioms(axiom.type);
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
            if (rel.characteristicType === "STATED_RELATIONSHIP" && parseInt(rel.groupId) > maxGroup) {
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
                if (rel.active) {
                  // copy relationship object and replace target relationship
                  var copy = angular.copy(rel);

                  // clear the effective time and source information
                  delete copy.sourceId;
                  delete copy.effectiveTime;
                  delete copy.relationshipId;
                  delete copy.released;

                  // set module id based on metadata
                  copy.moduleId = metadataService.isExtensionSet()? metadataService.getCurrentModuleId() : scope.concept.moduleId;

                  // set the group based on target
                  copy.groupId = newGroup;

                  scope.concept.relationships.push(copy);
                  if (++relsProcessed === relGroup.length) {
                    autoSave();
                    scope.computeRelationshipGroups();
                  }
                } else {
                  if (++relsProcessed === relGroup.length) {
                    autoSave();
                    scope.computeRelationshipGroups();
                  }
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

        scope.dropAxiomRelationshipGroup = function (relGroup, axiom) {

          if (!relGroup || relGroup.length === 0) {
            return;
          }

          if (scope.isStatic) {
            return;
          }

          // get the max group id and increment by one (or set to zero if no
          // groups defined)
          var maxGroup = -1;
          angular.forEach(axiom.relationships, function (rel) {
            maxGroup = parseInt(rel.groupId);
          });
          var newGroup = maxGroup + 1;

          var relsProcessed = 0;

          scope.warnings = [];

          var relationshipMap = {};

          let destinationIds = [];
          // strip identifying information from each relationship and push
          // to relationships with new group id
          angular.forEach(relGroup, function (rel) {
            if (constraintService.isAttributeAllowedForArray(rel.type.conceptId, axiom.allowedAttributes)) {

              constraintService.isValueAllowedForType(rel.type.conceptId, rel.target.conceptId, scope.branch).then(function () {
                  // copy relationship object and replace target relationship
                  var copy = angular.copy(rel);

                  destinationIds.push(copy.target.conceptId);
                  
                  // set the group based on target
                  copy.groupId = (metadataService.isUngroupedAttribute(rel.type.conceptId) || rel.type.conceptId === '116680003') ? 0 : newGroup;

                  // set module Id
                  copy.moduleId = metadataService.isExtensionSet()? metadataService.getCurrentModuleId() : scope.concept.moduleId;

                  // set sourceId from current concept
                  copy.sourceId = scope.concept.conceptId;

                  // retain the position of relationship
                  relationshipMap[relGroup.indexOf(rel)] = copy;
                  const ordered = {};
                  Object.keys(relationshipMap).sort().forEach(function(key) {
                    ordered[key] = relationshipMap[key];
                  });
                  
                  if (++relsProcessed === relGroup.length) {
                    for (var key in relationshipMap) {
                      axiom.relationships.push(relationshipMap[key]);
                      refreshAttributeTypesForAxiom(axiom);
                    }
                    bulkRetrieveFullConceptForRelationships(destinationIds);
                    autoSave();
                    scope.computeAxioms(axiom.type);
                  }

              }, function () {
                scope.warnings.push('MRCM validation error: ' + rel.target.fsn + ' is not valid for attribute type ' + rel.type.fsn);
                if (++relsProcessed === relGroup.length) {
                  for (var key in relationshipMap) {
                    axiom.relationships.push(relationshipMap[key]);
                    refreshAttributeTypesForAxiom(axiom);
                  }

                  autoSave();
                  scope.computeAxioms(axiom.type);
                }
              });
            } else {
              if (++relsProcessed === relGroup.length) {
                for (var key in relationshipMap) {
                  axiom.relationships.push(relationshipMap[key]);
                  refreshAttributeTypesForAxiom(axiom);
                }

                autoSave();
                scope.computeAxioms(axiom.type);
              }
              scope.warnings.push('MRCM validation error: Attribute ' + rel.type.fsn + ' not allowed for concept');
            }
          });
        };

        scope.getDragImageForConcept = function (fsn) {
          return fsn;
        };
        scope.getDragImageForAxiom = function (axiom) {
          return axiom.title;
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
        
        scope.getTerm = function (componentId) {
          if (componentTerms.hasOwnProperty(componentId)) {
            return componentTerms[componentId];
          } else {
            componentTerms[componentId] = 'Retrieving term...';
            if (terminologyServerService.isConceptId(componentId)) {
              terminologyServerService.getFullConcept(componentId, scope.branch).then(function (response) {
                componentTerms[componentId] = response.fsn;
              });
            } else if (terminologyServerService.isDescriptionId(componentId)) {
              terminologyServerService.getDescriptionProperties(componentId, scope.branch).then(function (response) {
                componentTerms[componentId] = response.term;
              })
            }
          }
        };

        scope.copyToClipboard = function(toCopy) {
          var body = angular.element($window.document.body);
          var textarea = angular.element('<textarea/>');
          textarea.css({
            position: 'fixed',
            opacity: '0'
          });
          textarea.val(toCopy);
          body.append(textarea);
          textarea[0].select();

          try {
            var successful = document.execCommand('copy');
            if (!successful) throw successful;
          } catch (err) {
            console.log("failed to copy", toCopy);
          }
          textarea.remove();
        };

        scope.getPerferredTerm = function () {
          if (!metadataService.isExtensionSet()) {
            for (var i = 0; i < scope.concept.descriptions.length; i++) {
              var des = scope.concept.descriptions[i];
              if (des.type === 'SYNONYM'
                  && des.active
                  && des.acceptabilityMap['900000000000508004'] === 'PREFERRED'
                  && des.acceptabilityMap['900000000000509007'] === 'PREFERRED') {
                return des.term;
              }
            }
          }
          else {
            var usPreferredTerm = '';
            var extensionPreferredTerm = '';
            var dialects = metadataService.getAllDialects();

            // Remove 'en-gb' and 'en-us' if any
            if (dialects.hasOwnProperty('900000000000508004')) {
              delete dialects['900000000000508004'];
            }
            if (dialects.hasOwnProperty('900000000000509007')) {
              delete dialects['900000000000509007'];
            }

            for (var i = 0; i < scope.concept.descriptions.length; i++) {
              var des = scope.concept.descriptions[i];
              if (des.type === 'SYNONYM' && des.active) {
                if (des.acceptabilityMap['900000000000509007'] === 'PREFERRED') {
                  usPreferredTerm = des.term;
                }

                if (Object.keys(dialects).length === 1 && des.acceptabilityMap[Object.keys(dialects)[0]] === 'PREFERRED') {
                  return des.term;
                }
              }
            }

            return usPreferredTerm;
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
         * Sets needed concept properties as element attributes
         * @param concept
         */
        scope.setAxiomProperties = function (axiom, $event) {
          if (!axiom) {
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

        function isMrcmAttributesValid (concept) {
          var errors = [];

          if (metadataService.isMrcmEnabled()) {
            for (var i = 0; i < scope.concept.classAxioms.length; i++) {
              var axiom = scope.concept.classAxioms[i];
              
              for (var j = axiom.relationships.length - 1; j >= 0; j--) {
                var rel = axiom.relationships[j];
                if (rel.active && rel.type.conceptId !== '116680003') {
                  if (typeof axiom.allowedAttributes !== 'undefined' && axiom.allowedAttributes.length !== 0) {
                    var found = axiom.allowedAttributes.filter(function(item){
                      return rel.type.conceptId === item.conceptId;
                    }).length !== 0;
                    if (!found) {                  
                      var errorMessage = 'MRCM validation error: The attribute type ' + rel.type.fsn + ' can not be used with the selected parents.';
                      errors.push(errorMessage);
                    }  
                  }                                  
                }                      
              }
            }
          }
          
          return errors;
        }

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
            var descDialects = scope.getDialectIdsForDescription(description);
            angular.forEach(descDialects, function (dialectId) {
              if (!metadataService.isExtensionSet()
                  || (metadataService.isExtensionSet() && (descDialects.length <= 2 || description.lang === scope.dialects[dialectId]))) {
                description.acceptabilityMap[dialectId] = 'PREFERRED';
              }
            });
            description.caseSignificance = 'ENTIRE_TERM_CASE_SENSITIVE';
          }

          // if a new description (determined by blank term), ensure sensitivity
          // do not modify acceptability map
          else if (!description.caseSignificance && !description.effectiveTime && description.type === 'SYNONYM' && !metadataService.isLockedModule(description.moduleId)) {
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
              if(metadataService.isExtensionSet() && !metadataService.useInternationalLanguageRefsets()){
                  delete description.acceptabilityMap['900000000000508004'];
              }
              if(!description.caseSignificance) {
                description.caseSignificance = 'CASE_INSENSITIVE';
              }
            }
          }

          if(scope.isBatch === true){
            scope.updateConceptReference({concept: scope.concept});
          }
            
          if (!description.effectiveTime && description.lang && metadataService.isExtensionSet() && !metadataService.useInternationalLanguageRefsets()) {
            angular.forEach(Object.keys(description.acceptabilityMap), function (dialectId) {
              // strip any dialects that are not belong to language
              if (scope.getDialectsForDescription(description)[dialectId].indexOf(description.lang) === -1) {
                delete description.acceptabilityMap[dialectId];
              }
            });
          }

          var semanticTagTattern =  new RegExp("^.*\\((.*)\\)$");
          var semanticTagFromFsn = null;
          if (description.type === 'FSN') {
            semanticTagFromFsn = semanticTagTattern.exec(description.term)[1];
          }

          var semanticTagFromSynonym = null;
          if (description.type === 'SYNONYM' && semanticTagTattern.exec(description.term)) {
            semanticTagFromSynonym = semanticTagTattern.exec(description.term)[1];
          }

          let excludedSemanticTags = ['medicinal product', 'medicinal product form', 'clinical drug', 'substance', 'product'];
          if ((semanticTagFromFsn  && excludedSemanticTags.includes(semanticTagFromFsn))
            || (semanticTagFromSynonym && semanticTags.includes(semanticTagFromSynonym))) {
            // just save data
            autoSave();
          } else {
            componentAuthoringUtil.runDescriptionAutomations(scope.concept, description, scope.template ? true : false).then(function () {
              autoSave();
            }, function (error) {
              notificationService.sendWarning('Automations failed: ' + error);
              autoSave();
            });
          }
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


            templateService.updateTargetSlot(scope.branch, scope.concept, scope.template ? scope.template : scope.concept.template, relationship).then(function () {
              scope.computeRelationshipGroups();
              sortRelationships();

              // run international dialect automations on target slot update (if appropriate)
              if (!metadataService.isExtensionSet()) {

                // if all target slots are set
                if (scope.concept.classAxioms[0].relationships.filter(function (r) {
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
          if (!scope.isStatic) {
            constraintService.getDomainAttributes(scope.concept, scope.branch).then(function (attributes) {
              scope.allowedAttributes = attributes;
            }, function (error) {
              notificationService.sendError('Error getting allowable domain attributes: ' + error);
            });
          }
        };

        scope.updateAxiomRelationship = function (relationship, type) {
          if (!relationship) {
            return;
          }
          refreshAttributeTypesForAxiom(axiom);
          scope.computeAxioms(type);
          autoSave();
        };

/////////////////////////////
// Undo / Redo functions
/////////////////////////////
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
          scope.computeAxioms(axiomType.ADDITIONAL);
            scope.computeAxioms(axiomType.GCI);


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
          let definedAxiom = false;
          angular.forEach(scope.concept.classAxioms, function(axiom){
              if(axiom.active && axiom.definitionStatus === 'FULLY_DEFINED'){
                  definedAxiom = true;
              }
          });
          if(definedAxiom){
              scope.concept.definitionStatus = 'FULLY_DEFINED';
          }
          else{
              scope.concept.definitionStatus = 'PRIMITIVE';
          }

          if (scope.conceptHistoryPtr < scope.conceptHistory.length - 1) {
            scope.conceptHistory = scope.conceptHistory.slice(0, scope.conceptHistoryPtr + 1);
          }
          
          scope.conceptHistory.push(JSON.parse(JSON.stringify(scope.concept)));
          scope.conceptHistoryPtr = scope.conceptHistory.length - 1;

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
        }

        /**
         * Undo:  Decrement history pointer and update display
         */
        scope.undo = function () {
          if (scope.conceptHistoryPtr > 0) {
            setTimeout(function () {
              restoreConcept(-1);
            }, 1000);                        
          }
        };

        /**
         * Redo:  Increment history pointer and update display
         */
        scope.redo = function () {
          if (scope.conceptHistoryPtr < scope.conceptHistory.length - 1) {
            setTimeout(function () {
              restoreConcept(+1);
            }, 1000);
          }
        };

        function restoreConcept(indexDiff) {
          scope.conceptHistoryPtr += indexDiff;
          scope.concept = scope.conceptHistory[scope.conceptHistoryPtr];
          saveModifiedConcept();
          scope.computeRelationshipGroups();
        }

        scope.downloadOWLAxiom = function () {
          $modal.open({
            templateUrl: 'shared/owl-axiom-expression/owlAxiomExpression.html',
            controller: 'owlAxiomExpressionModalCtrl',
            resolve: {
              branch: function () {
                return scope.branch;
              },
              conceptId: function () {
                return scope.concept.conceptId;
              },
              conceptFSN: function() {
                return scope.concept.fsn;
              },
              classAxioms: function () {
                return scope.concept.classAxioms;
              },
              gciAxioms: function () {
                return scope.concept.gciAxioms;
              }
            }
          });
        };

        scope.revertAxiom = function (axiom) {
          modalService.confirm('The axiom will be reverted to the previously published version. Do you want to proceed?').then(function () {
            notificationService.sendMessage('Reverting axiom to the previously published version...');
            var codeSystemShortName = '';
            getCodeSystemShortName().then(function (response) {
              codeSystemShortName = response;
              getAllCodeSystemVersionsByShortName(codeSystemShortName).then(function (response) {
                if (response.items.length > 0) {
                  var version = response.items[response.items.length - 1].version;
                  var versionBranch = null;
                  if(codeSystemShortName === 'SNOMEDCT' || response.isNewBranch) {
                    versionBranch = 'MAIN/' + version;
                  } else {
                    var arr = scope.branch.split("/");
                    versionBranch = arr.slice(0,arr.length - 2).join("/") + '/' + version;
                  }
                  terminologyServerService.getFullConcept(scope.concept.conceptId, versionBranch).then(function (versionedConcept) {
                    if(axiom.type === 'additional'){
                        angular.forEach(versionedConcept.classAxioms, function(versionedAxiom){
                            if(axiom.axiomId === versionedAxiom.axiomId){
                                angular.forEach(scope.concept.classAxioms, function(unversionedAxiom){
                                  if(unversionedAxiom.axiomId === versionedAxiom.axiomId){
                                    unversionedAxiom.relationships = versionedAxiom.relationships;
                                    unversionedAxiom.effectiveTime = versionedAxiom.effectiveTime;
                                    unversionedAxiom.definitionStatus = versionedAxiom.definitionStatus;
                                    unversionedAxiom.active = versionedAxiom.active;
                                    unversionedAxiom.moduleId = versionedAxiom.moduleId;
                                    scope.saveConcept();
                                    return
                                  }
                                })
                            }
                        })
                    }
                    else{
                      angular.forEach(versionedConcept.gciAxioms, function(versionedAxiom){
                        if(axiom.axiomId === versionedAxiom.axiomId){
                          angular.forEach(scope.concept.gciAxioms, function(unversionedAxiom){
                            if(unversionedAxiom.axiomId === versionedAxiom.axiomId){
                              unversionedAxiom.relationships = versionedAxiom.relationships;
                              unversionedAxiom.effectiveTime = versionedAxiom.effectiveTime;
                              unversionedAxiom.definitionStatus = versionedAxiom.definitionStatus;
                              unversionedAxiom.active = versionedAxiom.active;
                              unversionedAxiom.moduleId = versionedAxiom.moduleId;
                              scope.saveConcept();
                              return
                            }
                          })
                        }
                      })
                    }
                  }, function (error) {
                    notificationService.sendError('Failed to get versioned axiom');
                  });
                } else {
                  notificationService.sendError('Failed to get versions');
                }
              });
            });
          }, function () {
            // do nothing
          });

        };

        scope.revertToVersion = function () {
          modalService.confirm('The concept will be reverted to the previously published version. Do you want to proceed?').then(function () {
            notificationService.sendMessage('Reverting concept to the previously published version...');
            var codeSystemShortName = '';
            getCodeSystemShortName().then(function (response) {
              codeSystemShortName = response;
              getAllCodeSystemVersionsByShortName(codeSystemShortName).then(function (response) {
                if (response.items.length > 0) {
                  var version = response.items[response.items.length - 1].version;
                  var versionBranch = null;
                  if(codeSystemShortName === 'SNOMEDCT' || response.isNewBranch) {
                    versionBranch = 'MAIN/' + version;
                  } else {
                    var arr = scope.branch.split("/");
                    versionBranch = arr.slice(0,arr.length - 2).join("/") + '/' + version;
                  }

                  var result = {};
                  result.versionedConcept = null;
                  result.projectConcept = null;

                  var getVersionedConceptFn = function () {
                    var deferred = $q.defer();
                    terminologyServerService.getFullConcept(scope.concept.conceptId, versionBranch).then(function (response) {
                      result.versionedConcept = response;
                      deferred.resolve();
                    }, function (error) {
                      deferred.resolve();
                    });
                    return deferred.promise;
                  };

                  var getProjectConceptFn = function () {
                    var deferred = $q.defer();
                    var arr = scope.branch.split("/");
                    var branch = arr.slice(0,arr.length - 1).join("/");
                    terminologyServerService.getFullConcept(scope.concept.conceptId, branch).then(function (response) {
                      result.projectConcept = response;
                      deferred.resolve();
                    }, function (error) {
                      deferred.resolve();
                    });
                    return deferred.promise;
                  };

                  var promises = [];
                  promises.push(getVersionedConceptFn());
                  promises.push(getProjectConceptFn());
                  // on resolution of all promises
                  $q.all(promises).then(function () {
                    if (!result.versionedConcept && !result.projectConcept){
                      notificationService.clear();
                      modalService.message('This concept was created on this task, please use the delete functionality to remove it.');
                    } else {
                      scope.concept = result.versionedConcept ? result.versionedConcept : result.projectConcept;
                      scope.unmodifiedConcept = JSON.parse(JSON.stringify(result.versionedConcept ? result.versionedConcept : result.projectConcept));
                      scope.isModified = false;
                      scope.componentStyles = {}; // clear highlighting if any
                      scope.saveConcept();
                    }
                  });
                } else {
                  notificationService.sendError('Failed to get versions');
                }
              });
            });
          }, function () {
            // do nothing
          });

        };

        function getCodeSystemShortName() {
          var deferred = $q.defer();

          if (!metadataService.isExtensionSet()) {
            deferred.resolve('SNOMEDCT');
          } else {
            //var branch = 'MAIN/2018-01-31/SNOMEDCT-DK/TESTDK1/TESTDK1-34';
            var arr = scope.branch.split("/");
            var branch = arr.slice(0,arr.length - 2).join("/");
            terminologyServerService.getBranch(branch).then(function (response) {
              deferred.resolve(response.metadata.codeSystemShortName);
            });
          }
          return deferred.promise;
        }

        function getAllCodeSystemVersionsByShortName (codeSystemShortName) {
          var deferred = $q.defer();
          var result = {};
          result.isNewBranch = false;
          var allCodeSystemVersion = function (codeSystem) {
            terminologyServerService.getAllCodeSystemVersionsByShortName(codeSystem).then(function (response) {
              if (response.data.items && response.data.items.length > 0) {
                result.items = response.data.items;
                deferred.resolve(result);
              } else {
                if (codeSystem != 'SNOMEDCT') {
                  result.isNewBranch = true;
                  allCodeSystemVersion('SNOMEDCT');
                } else {
                  result.items = [];
                  deferred.resolve(result);
                }
              }
            });
          }
          allCodeSystemVersion(codeSystemShortName);
          return deferred.promise;
        }

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
            terminologyServerService.getFullConcept(scope.concept.conceptId, scope.branch).then(function (response) {
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

        scope.copyDescriptionTerm = function(e) {
          var elem = angular.element(e.currentTarget)[0];
          if (elem.selectionStart !== undefined
              && elem.selectionEnd !== undefined) {
            var startPos = elem.selectionStart;
            var endPos = elem.selectionEnd;
            var selectedText = elem.value.substring(startPos, endPos);
            scope.copyToClipboard(selectedText);
            elem.focus();
            elem.setSelectionRange(startPos, endPos);
          }
        };

//////////////////////////////////////////////
// MRCM functions
//////////////////////////////////////////////

        function refreshAttributeTypesForAxiom(axiom){
            var deferred = $q.defer();
            if (!scope.isStatic) {
                    constraintService.getDomainAttributesForAxiom(axiom, scope.branch).then(function (attributes) {
                    axiom.allowedAttributes = attributes;
                    deferred.resolve();
                }, function (error) {
                    notificationService.sendError('Error getting allowable domain attributes: ' + error);
                });
            }
            else {
              deferred.resolve();
            }
            return deferred.promise;
        }  

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
          relationship.type.pt = item.pt.term;
          if (metadataService.isMrcmEnabled() && relationship.target.conceptId) {
            constraintService.isValueAllowedForType(relationship.type.conceptId, relationship.target.conceptId, scope.branch).then(function () {
                scope.updateRelationship(relationship, false);
              }, function () {
                relationship.target = {};
                relationship.target.conceptId = null;
                scope.updateRelationship(relationship, false);
              }
            );
          }
          else {
            scope.updateRelationship(relationship, false);
          }

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

        scope.setAxiomRelationshipTypeConcept = function (relationship, item, type, relationshipGroupId, parentIndex, itemIndex) {
          if (!relationship || !item) {
            console.error('Cannot set relationship concept field, either field or item not specified');
          }
          relationship.type.conceptId = item.id;
          relationship.type.fsn = item.fsn.term;
          relationship.type.pt = item.pt.term;
          if (metadataService.isMrcmEnabled() && relationship.target.conceptId) {
            constraintService.isValueAllowedForType(relationship.type.conceptId, relationship.target.conceptId, scope.branch).then(function () {
                scope.computeAxioms(type);
                autoSave();
              }, function () {
                relationship.target = {};
                relationship.target.conceptId = null;
                scope.computeAxioms(type);
                autoSave();
              }
            );
          }
          else {
            scope.computeAxioms(type);
            autoSave();
          }

          // Trigger blur event after relationship type has been selected
          var elemID = type +'-axiom-relationship-type-' + scope.initializationTimeStamp + '-' + parentIndex + '-' + relationshipGroupId + '-' + itemIndex;
          var elem = angular.element(document.querySelector('#' + elemID));
          $timeout(function () {
            elem[0].blur();
            var parent = $('#' + elemID).closest('.editHeightSelector');
            if(parent.find("textarea").filter(function() { return this.value == ""; }).length > 0){
                parent.find("textarea").filter(function() { return this.value == ""; })[0].focus();
            }
          }, 1000);
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
                if(!metadataService.isExtensionSet()
                  && relationship.type.conceptId === '116680003' // Is a (attribute)
                  && relationship.moduleId !== item.moduleId) {
                  resetModuleId(item.moduleId);
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
            if(!metadataService.isExtensionSet()
              && relationship.type.conceptId === '116680003' // Is a (attribute)
              && relationship.moduleId !== item.moduleId) {
              resetModuleId(item.moduleId);
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

        function resetModuleId(moduleId) {
          scope.concept.moduleId = moduleId;

          for (var k = scope.concept.descriptions.length - 1; k >= 0; k--) {
            var description = scope.concept.descriptions[k];
            description.moduleId = moduleId;
          }

          angular.forEach(scope.concept.classAxioms, function (axiom) {            
            axiom.moduleId = moduleId;           
            angular.forEach(axiom.relationships, function (relationship) {
              relationship.moduleId = moduleId;
            });
          });
          angular.forEach(scope.concept.gciAxioms, function (axiom) {
            axiom.moduleId = moduleId;
            angular.forEach(axiom.relationships, function (relationship) {
              relationship.moduleId = moduleId;              
            });
          });

          
        }

        scope.consolidateRelationship = function (relationship) {
          if(relationship) {
            if (relationship.target && !relationship.target.fsn) {
              relationship.target = {};
            }
            if (relationship.type && !relationship.type.fsn) {
              relationship.type = {};
            }
          }
        };

        scope.setAxiomRelationshipTargetConcept = function (relationship, item, axiom, relationshipGroupId, parentIndex, itemIndex) {
          if (!relationship || !item) {
            console.error('Cannot set relationship concept field, either field or item not specified');
          }

          var populateRelationshipTarget = function(relationship, item) {
              relationship.target.conceptId = item.id;
              relationship.target.fsn = item.fsn.term;
              relationship.target.definitionStatus = item.definitionStatus;
              relationship.target.effectiveTime = item.effectiveTime;
              relationship.target.moduleId = item.moduleId;
              relationship.target.active= item.active;
              relationship.target.released = item.released;
          }

          if (scope.template) {
            if (!relationship.template || !relationship.template.targetSlot) {
              relationship.target.fsn = tempFsn;
              return;
            }
            constraintService.isValueAllowedForType(relationship.type.conceptId, item.id, scope.branch,
              relationship.template && relationship.template.targetSlot ? relationship.template.targetSlot.allowableRangeECL : null).then(function () {
                populateRelationshipTarget(relationship, item);

              let destinationIds = [];
              destinationIds.push(relationship.target.conceptId);
              bulkRetrieveFullConceptForRelationships(destinationIds);

              if(!metadataService.isExtensionSet()
                && relationship.type.conceptId === '116680003') {// Is a (attribute)
                terminologyServerService.getFullConcept(data.id, scope.branch).then(function(response) {
                  if (relationship.moduleId !== response.moduleId) {
                    resetModuleId(response.moduleId);
                  }
                  scope.updateRelationship(relationship, false);
                  scope.isModified = true;
                  scope.computeAxioms(type);
                  refreshAttributeTypesForAxiom(axiom);
                  autoSave();
                });
              } else {
                scope.updateRelationship(relationship, false);
                autoSave();
              }
            }, function (error) {
              scope.warnings = ['Concept ' + data.id + ' |' + data.name + '| not in target slot allowable range: ' + relationship.template.targetSlot.allowableRangeECL];
              relationship.target.fsn = tempFsn;
            });
          } else if (metadataService.isMrcmEnabled()) {
            if (!relationship.type.conceptId) {
              scope.warnings = ['MRCM validation error: Must set attribute type first'];
            } else {
              constraintService.isValueAllowedForType(relationship.type.conceptId, item.id, scope.branch).then(function () {
                populateRelationshipTarget(relationship, item);

                let destinationIds = [];
                destinationIds.push(relationship.target.conceptId);
                bulkRetrieveFullConceptForRelationships(destinationIds);

                refreshAttributeTypesForAxiom(axiom).then(function() {
                  if (relationship.type.conceptId === '116680003') {
                    var errors = isMrcmAttributesValid(scope.concept);
                    if (errors && errors.length > 0) {
                      scope.errors = scope.errors ? scope.errors.concat(errors) : errors;                      
                    }
                  }                  
                });
                scope.computeAxioms(axiom.type);

                scope.updateRelationship(relationship);
                autoSave();
              }, function () {
                scope.warnings = ['MRCM validation error: ' + item.fsn.term + ' is not a valid target for attribute type ' + relationship.type.fsn + '.'];
              });
            }
          } else {
            populateRelationshipTarget(relationship, item);

            refreshAttributeTypesForAxiom(axiom);
            scope.computeAxioms(axiom.type);
            autoSave();
          }

          // Trigger blur event after relationship target has been selected
          setFocusToNextInputElement(axiom, relationshipGroupId, parentIndex, itemIndex);
        };

        function setFocusToNextInputElement(axiom, relationshipGroupId, parentIndex, itemIndex) {
          var elemID = axiom.type + '-axiom-relationship-target-' + scope.initializationTimeStamp + '-' + parentIndex + '-' + relationshipGroupId + '-' + itemIndex;
          var elem = angular.element(document.querySelector('#' + elemID));
          $timeout(function () {
            elem[0].blur();
            var parent = $('#' + elemID).closest('.editHeightSelector');
            if(parent.find("textarea").filter(function() { return this.value == ""; }).length > 0){
                parent.find("textarea").filter(function() { return this.value == ""; })[0].focus();
            }
          }, 1000);
        }
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
        scope.showModel = function (concept) {
          scope.modelVisible = !scope.modelVisible;
          if ($('#image-' + concept.conceptId).css('display') === 'none') {
            $('#image-' + concept.conceptId).css('display', 'inline-block');
          }
          else {
            $('#image-' + concept.conceptId).css('display', 'none');
          }
        };

// sets the popover direction (left, bottom, right) based on current
// position of root element
        scope.setPopoverDirection = function ($event) {
          if ($event.pageX === 0) {
            return;
          }
          
          var direction = 'left';

          // morebuttons are the concept edit panel 'more details' popovers (concept, description, attribute)
          if ($event.target.className.indexOf('morebuttons') >= 0) {
            direction = 'left-top';
          }

          if ($event.pageX  > 0 && $event.pageX < 700) {
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

          //Set to blue as default for "is a"-field when creating a new concept
          if (relationship && relationship.type && relationship.type.conceptId === '116680003' 
              && !terminologyServerService.isSctid(scope.concept.conceptId)
              && !scope.template && !scope.concept.template) {
            return 'PRIMITIVE';
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
              if(scope.componentStyles[key].new && component && component.axiomId){
                  return defaultStyle
              }
              else {
                  return scope.componentStyles[key].style;
              }
            } 
            else {
              return defaultStyle;
            }
          }
        };

        scope.getDuplicatedRelOrCircularReferenceStyle = function (component) {

          // relationship is specified and newly created one
          if(component) {
            if (scope.concept.conceptId === component.target.conceptId
                && !component.relationshipId) {
              return 'redhl';
            }
            for (var i = 0; i < scope.concept.relationships.length; i++) {
              var relationship = scope.concept.relationships[i];
              if (relationship.characteristicType === 'STATED_RELATIONSHIP'
                && relationship.relationshipId !== component.relationshipId
                && relationship.groupId === component.groupId
                && relationship.type.conceptId === component.type.conceptId
                && relationship.target.conceptId === component.target.conceptId
                && (!component.relationshipId || !relationship.relationshipId)) {
                return 'redhl';
              }
            }
          } else {
            for (var i = 0; i < scope.concept.relationships.length; i++) {
              var relationship = scope.concept.relationships[i];
              if (relationship.characteristicType === 'STATED_RELATIONSHIP'
                && relationship.target.conceptId === scope.concept.conceptId
                && !relationship.relationshipId) {
                return 'redhl';
              }
            }
          }
          return '';
        };
        
        scope.getExtensionNamespace = function () {
          var conceptId = scope.concept.conceptId + '';
          var partitionIdentifier = conceptId.slice(conceptId.length - 3, conceptId.length - 1)
          if (!metadataService.isExtensionSet()
                  && terminologyServerService.isSctid(scope.concept.conceptId)
                  && scope.concept.active
                  && !scope.concept.effectiveTime
                  && !scope.concept.released
                  && partitionIdentifier === '10' /* Long format concept */) {
            var namespaceId = conceptId.slice(conceptId.length - 10, conceptId.length - 3);
            var namespace = metadataService.getNamespaceById(parseInt(namespaceId));
            scope.extensionNamespace =  namespace.organizationName;
            return namespace.organizationName;
          }

          return '';
        }

//////////////////////////////////////////////////////////////////////////
// CHeck for Promoted Task -- must be static
// ////////////////////////////////////////////////////////////////////////

// function to set static flag if task is promoted, regardless of
// other context
        function checkPromotedStatus () {
          if ($routeParams.taskKey) {
            scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
              scope.task = response;

              if (scope.task.status === 'Promoted') {
                scope.isStatic = true;
              }
            });
          }
        };

// watch for setting focus when a concept is added to editing view
        scope.$on('enableAutoFocus', function (event, data) {
          if(scope.concept.conceptId === data.conceptId ) {
            if (scope.concept.released) {
              scope.focusHandler(true, false);
            } else if (!scope.isStatic) {
              var textareaTags = $('#concept-edit-' + data.conceptId).find('textarea');
              textareaTags[0].focus();
              scope.hasFocus = false;
            }
          }
        });

        scope.$on('removeConceptFromEditing', function (event, data) {
          scope.removeConcept(scope.concept);
        });
// watch for classification completion request to reload concepts
// will not affect modified concept data
        scope.$on('reloadConcepts', function () {

          // if modified, do nothing
          if (scope.isModified) {
            // do nothing
          }

          // otherwise, re-retrieve the concept
          else {
            terminologyServerService.getFullConcept(scope.concept.conceptId, scope.branch).then(function (concept) {
              scope.concept = concept;

              sortDescriptions();
              sortRelationships();
              scope.computeAxioms(axiomType.ADDITIONAL);
              scope.computeAxioms(axiomType.GCI);
            });
          }
        });

        scope.$on('batchEditing.conceptChange', function (event, data) {
          console.debug('batchEditing.conceptChange', data);
          if (data.concept.conceptId === scope.concept.conceptId || data.concept.previousConceptId === scope.concept.conceptId) {
            scope.concept = data.concept;
            scope.isModified = data.isModified;
          }
        });

        function bindingMouseScrollEvent(element) {
          $(element).on('mousewheel DOMMouseScroll', function(e) {
            var scrollTo = null;

            if(e.type === 'mousewheel') {
               scrollTo = (e.originalEvent.wheelDelta * -1);
            }
            else if(e.type === 'DOMMouseScroll') {
               scrollTo = 40 * e.originalEvent.detail;
            }

            if(scrollTo) {
               e.preventDefault();
               $(this).scrollTop(scrollTo + $(this).scrollTop());
            }
          });
        }

        function registerMouseScrollEvent() {
          var dropDowns = $('.dropdown-menu');
          for (var i = 0; i < dropDowns.length; i++) {
            bindingMouseScrollEvent(dropDowns[i]);
          }
        }

        // set the initial binding mouse wheel event when content is fully loaded
        angular.element(document).ready(function () {
            registerMouseScrollEvent();
        });

        scope.$on('registerMouseScrollEvent', function (event, data) {
          if (scope.concept.conceptId === data.id) {
            registerMouseScrollEvent();
          }
        });

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

        scope.openConceptTarget = function (rel){
          if (!rel || !rel.target || !rel.target.conceptId) {
            return;
          }
          $rootScope.$broadcast('editConcept', {conceptId: rel.target.conceptId, fsn: rel.target.fsn, noSwitchView: true});
        };

        scope.openAttributeConcept = function (rel){
          if (!rel || !rel.target || !rel.target.conceptId) {
            return;
          }
          $rootScope.$broadcast('editConcept', {conceptId: rel.type.conceptId, fsn: rel.type.fsn, noSwitchView: true});
        };

        function getRole () {
          scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (task) {
            if (task) {
              accountService.getRoleForTask(task).then(function (role) {
                scope.role = role;
              });
              if (scope.role === 'UNDEFINED') {
                notificationService.sendError('Could not determine role for task ' + $routeParams.taskKey);
              }
            }
          });
        }

        function bindMouseEvents() {
          var focusListener = function () {
            scope.focusHandler(true, false);
          };
  
          // Bind events : mouse enter, mouse focus, ..
          element[0].addEventListener('mouseenter', focusListener, true);
          element[0].addEventListener('focus', focusListener, true);
        }

        function getTemplates() {
          if(metadataService.isTemplatesEnabled()){
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
          else{
            scope.templates = null
          };
        }

        function initializeCRSConcept() {
          scope.hideInactive = false;

          var crsContainer = crsService.getCrsConcept(scope.concept.conceptId);

          scope.isModified = !crsContainer.saved;
        }

        function loadModifiedConcept() {
          var deferred = $q.defer();
          scaService.getModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId).then(function (modifiedConcept) {
  
            // if not an empty JSON object, process the modified version
            if (modifiedConcept) {

              // replace the displayed content with the modified concept
              scope.concept = modifiedConcept;            

              // reset the concept history to reflect modified change
              resetConceptHistory();

              // set scope flag
              scope.isModified = true;

              scope.computeRelationshipGroups();
              scope.computeAxioms(axiomType.ADDITIONAL);
              scope.computeAxioms(axiomType.GCI);
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
                  scope.computeRelationshipGroups();
                })

                }

                // check for new concept with non-SCTID conceptId -- ignore blank id concepts
                else if (scope.concept.conceptId && !terminologyServerService.isSctid(scope.concept.conceptId)) {

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
                scope.computeAxioms(axiomType.ADDITIONAL);
                scope.computeAxioms(axiomType.GCI);
                sortDescriptions();
                sortRelationships();
              }
              ,
              function (error) {
                notificationService.sendError('Unexpected error checking for concept template: ' + error);
              }
            );

            sortDescriptions();
            sortRelationships();

            deferred.resolve();
          });
          
          return deferred.promise;
        }

        function loadDeletedComponents() {
          var deferred = $q.defer();

          var addDeletedComponents = function () {
            var currentConcept = angular.copy(scope.concept);
            var originalConcept = angular.copy(scope.originalConcept)
            terminologyServerService.cleanConcept(currentConcept);
            terminologyServerService.cleanConcept(originalConcept);

            componentHighlightUtil.runComparison(null, null, currentConcept, originalConcept).then(function (response){
              var newConcept = response.concept;

              if (!scope.componentStyles) {
                scope.componentStyles = {};
              }

              // highlight for deleted/modified axioms that have been changed in the task's life cycle
              angular.forEach(newConcept.classAxioms, function(axiom){
                angular.forEach(axiom.relationships, function(relationship){
                  if (relationship.deleted) {
                    angular.forEach(scope.concept.classAxioms, function(currentAxiom){
                      if (axiom.axiomId === currentAxiom.axiomId) {
                        var index = -1;
                        for (var i = 0; i < currentAxiom.relationships.length; i++) {
                          if (currentAxiom.relationships[i].active                          
                            && currentAxiom.relationships[i].groupId == relationship.groupId
                            && (currentAxiom.relationships[i].type.conceptId == relationship.type.conceptId
                              || currentAxiom.relationships[i].target.conceptId == relationship.target.conceptId)) {
                              index = i;
                            }
                        }
                        if (index !== -1) {
                          currentAxiom.relationships.splice(index + 1, 0, relationship);
                        }
                        else {
                          currentAxiom.relationships.push(relationship);
                        }                       
                        
                        scope.componentStyles[relationship.relationshipId] = response.styles[relationship.relationshipId];
                      }
                    });
                  }
                });
              });      
              
              angular.forEach(newConcept.gciAxioms, function(axiom){
                angular.forEach(axiom.relationships, function(relationship){
                  if (relationship.deleted) {
                    angular.forEach(scope.concept.gciAxioms, function(currentAxiom){
                      if (axiom.axiomId === currentAxiom.axiomId) {
                        currentAxiom.relationships.push(relationship);
                        scope.componentStyles[relationship.relationshipId] = response.styles[relationship.relationshipId];
                      }
                    });
                  }
                });
              });             

              scope.computeAxioms(axiomType.ADDITIONAL);
              scope.computeAxioms(axiomType.GCI);
            });
          };

          if (!scope.originalConcept) {
            terminologyServerService.getFullConceptAtDate(scope.concept.conceptId, scope.branch, null, '-').then(function (response) {
                scope.originalConcept = response;              
                addDeletedComponents();              
  
                deferred.resolve();
              },           
              function() {
                deferred.resolve();
              }
            );
          }
          else {
            addDeletedComponents();         

            deferred.resolve();
          }         

          return deferred.promise;
        }

        function onloadConcept() {
          // on load, load validation report for REVIEWER
          if (scope.loadValidation === 'true' || scope.loadValidation === true) {
            var copiedConcept = angular.copy(scope.concept);
            scope.validateConcept(copiedConcept);
          }          

          // on load, set default module id for components if not set yet
          setDefaultModuleId();

          scope.computeAxioms(axiomType.ADDITIONAL);
          scope.computeAxioms(axiomType.GCI);

          var destinationIds = [];

          //Watch classAxiom relationships for changes and update allowable attributes
          angular.forEach(scope.concept.classAxioms, function(axiom){
            angular.forEach(axiom.relationships, function(rel) {
              destinationIds.push(rel.target.conceptId);
            });
            scope.$watch(axiom.relationships, function (newValue, oldValue) {
                refreshAttributeTypesForAxiom(axiom);
                scope.computeAxioms(axiomType.ADDITIONAL);
            }, true);
          });

          //Watch gciAxiom relationships for changes and update allowable attributes
          angular.forEach(scope.concept.gciAxioms, function(axiom){
            angular.forEach(axiom.relationships, function(rel) {
              destinationIds.push(rel.target.conceptId);
            });
              scope.$watch(axiom.relationships, function (newValue, oldValue) {
                  refreshAttributeTypesForAxiom(axiom);
                  scope.computeAxioms(axiomType.GCI);
              }, true);
          });         

          // load all relationship concepts
          if (destinationIds.length !== 0) {
            // bulk call for concept ids
            bulkRetrieveFullConceptForRelationships(destinationIds);            
          }

          // on load, load the deleted components if any
          if(scope.highlightChanges) {
            loadDeletedComponents();
          }

          // adjust for all textareas covered by Angular Elastic
          // see https://github.com/monospaced/angular-elastic
          $timeout(function () {
            $rootScope.$broadcast('elastic:adjust');
          }, 0);          
        }

        function initialize() {
          if (!scope.concept) {
            console.error('Concept not specified for concept-edit');
            return;
          }
  
          if (!scope.branch) {
            console.error('Branch not specified for concept-edit');
            return;
          }

          // on load, check task status
          checkPromotedStatus();
          
          getRole();

          if (scope.concept.validation) {
            scope.validation = scope.concept.validation;
          }

          // on load, check for expected render flag applied in saveHelper
          if (scope.concept.catchExpectedRender) {
            delete scope.concept.catchExpectedRender;
            scope.validateConcept(scope.concept).then(function () {
              scope.reapplyTemplate();
            });
          }

          //
          // CRS concept initialization
          //
          if (crsService.isCrsConcept(scope.concept.conceptId) && $rootScope.pageTitle !== 'Providing Feedback/') {
            initializeCRSConcept();            
          }           

          bindMouseEvents();

          getTemplates();

          // on load, sort descriptions && relationships
          sortDescriptions();
          sortRelationships();
          
          // define the available dialects
          scope.dialects = metadataService.getAllDialects();

          // initialize the last saved version of this concept
          scope.unmodifiedConcept = JSON.parse(JSON.stringify(scope.concept));
          scope.unmodifiedConcept = scope.addAdditionalFields(scope.unmodifiedConcept);
          if (scope.autosave === false && scope.isBatch === false) {
            scope.concept = scope.unmodifiedConcept;
          }

          // set the initial direction based on load position
          $timeout(function () {          
            if ($(element)[0].getBoundingClientRect().left < 700) {
              scope.popoverDirection = 'right-top';            
            } else {
              scope.popoverDirection = 'left-top';            
            }
          }, 1000);

          // on load, check if a modified, unsaved version of this concept
          // exists -- only applies to task level, safety check
          if ($routeParams.taskKey && scope.autosave === true) {
            loadModifiedConcept().then(function() {
              onloadConcept();
            });
          } 
          else {
            onloadConcept();
          }                    
        }

        initialize();
      }
    };
  }
);

