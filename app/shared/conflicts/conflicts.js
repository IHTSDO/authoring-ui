angular.module('singleConceptAuthoringApp')

  .directive('conflicts', ['$rootScope', 'ngTableParams', '$routeParams', '$filter', '$interval', '$timeout', '$modal', '$compile', '$sce', 'scaService', 'componentAuthoringUtil', 'terminologyServerService', 'notificationService', '$q', '$window', '$location', 'metadataService',
    function ($rootScope, NgTableParams, $routeParams, $filter, $interval, $timeout, $modal, $compile, $sce, scaService, componentAuthoringUtil, terminologyServerService, notificationService, $q, $window, $location, metadataService) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {

          // branch this conflict report was generated against
          sourceBranch: '=',

          // branch this conflict report was generated for
          targetBranch: '='

        },
        templateUrl: 'shared/conflicts/conflicts.html',

        link: function (scope) {

          $rootScope.pageTitle = 'Concept Merges/' + $routeParams.projectKey + ($routeParams.taskKey ? '/' + $routeParams.taskKey : '');

          // pass task key to scope for display trigger
          scope.taskKey = $routeParams.taskKey;

          scope.toggleSidebar = function () {
            scope.hideSidebar = !scope.hideSidebar;
          };

          // display text
          scope.comparingText = $routeParams.taskKey ? 'Comparing task to project, please wait just a moment...' : 'Comparing project to mainline content, please wait just a moment...';
          scope.rebasingText = $routeParams.taskKey ? 'Task and project can be merged without issues, pulling changes in from project...' : 'Project can be merged with mainline content without issues, pulling changes in from mainline content...';
          scope.badStateText = ($routeParams.taskKey ? 'Project ' + $routeParams.projectKey : 'The mainline content') + ' has changed; the merge review is no longer complete.  Click to regenerate the merge review.';
          scope.isTask = $routeParams.taskKey;

          /**
           * Conflict ngTable parameters
           */
          scope.conflictsToReviewTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'asc'},
              orderBy: 'fsn'
            },

            {
              filterDelay: 50,
              total: scope.conflicts ? scope.conflicts.length : 0,

              getData: function ($defer, params) {

                var concepts = scope.conflicts.filter(function (conflict) {
                  return !conflict.accepted;
                });

                if (!concepts) {
                  $defer.resolve([]);
                } else {

                  params.total(concepts.length);
                  concepts = params.sorting() ? $filter('orderBy')(concepts, params.orderBy()) : concepts;
                  concepts = concepts.slice((params.page() - 1) * params.count(), params.page() * params.count());
                  //  console.debug('concepts to review page', concepts);

                  if (concepts.length === 0 && scope.conflicts.length !== 0) {
                    scope.actionTab = 2; // switch to conflicts resolved
                    scope.mergesComplete = true;
                  } else {
                    scope.mergesComplete = false;
                  }

                  $defer.resolve(concepts);
                }
              }
            }
          );

          /**
           * Conflict ngTable parameters
           */
          scope.conflictsAcceptedTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'asc'},
              orderBy: 'fsn'
            },
            {
              filterDelay: 50,
              total: scope.conflicts ? scope.conflicts.length : 0,

              getData: function ($defer, params) {

                var concepts = scope.conflicts.filter(function (conflict) {
                  return conflict.accepted;
                });

                if (!concepts) {
                  $defer.resolve([]);
                } else {

                  params.total(concepts.length);
                  concepts = params.sorting() ? $filter('orderBy')(concepts, params.orderBy()) : concepts;
                  concepts = concepts.slice((params.page() - 1) * params.count(), params.page() * params.count());

                  $defer.resolve(concepts);
                }
              }
            }
          );

          scope.$on('acceptMerge', function (event, data) {

            if (!data.concept) {
              console.error('AcceptMerge event must have concept attached');
              return;
            }
            if (!data.validationResults || !data.validationResults.errors || !data.validationResults.warnings) {
              console.error('AcceptMerge event must have validation results (empty or non-empty) attached');
              return;
            }

            if (Object.keys(data.validationResults.errors).length > 0) {
              notificationService.sendError('Please resolve convention errors prior to accepting concept merge.');
            } else {

              terminologyServerService.cleanConcept(data.concept);

              notificationService.sendMessage('Accepting merged version for concept ' + data.concept.conceptId);
              scope.conceptUpdateFunction($routeParams.projectKey, $routeParams.taskKey, data.concept).then(function (response) {
                notificationService.sendMessage('Merge accepted for concept ' + data.concept.conceptId, 5000);

                // mark the conflict as accepted
                angular.forEach(scope.conflicts, function (conflict) {
                  if (conflict.conceptId === data.concept.conceptId) {
                    conflict.accepted = true;

                    // update the ui state
                    if (scope.acceptedConceptIds.indexOf(conflict.conceptI)) {
                      scope.acceptedConceptIds.push(conflict.conceptId);
                      if ($routeParams.taskKey) {
                        scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'merges-accepted-' + scope.id, scope.acceptedConceptIds);
                      } else {
                        scaService.saveUiStateForUser($routeParams.projectKey + '-merges-accepted-' + scope.id, scope.acceptedConceptIds);
                      }
                    }
                  }
                });

                // remove the concept from the viewed list (use the $on
                // statement in this file) -- only if no errors detected,
                // otherwise leave the concept in editing to display warnings
                if (Object.keys(data.validationResults.warnings).length === 0) {
                  $rootScope.$broadcast('stopEditing', {concept: data.concept});
                } else {
                  $rootScope.$broadcast('stopEditing', {concept: data.concept});
                  notificationService.sendWarning('Merged changes accepted, but convention warnings were detected');
                }

                // reload the tables
                scope.conflictsToReviewTableParams.reload();
                scope.conflictsAcceptedTableParams.reload();

              }, function (error) {
                notificationService.sendError('Error accepting merge');
              });
            }
          });

          /////////////////////////////////////////////////////
          // Helper functions
          /////////////////////////////////////////////////////

          var exitTimer = null;
          function exitConflictsView() {
            if ($routeParams.taskKey) {
              exitTimer = $timeout(function () {
                $location.path('/tasks/task/' + $routeParams.projectKey + '/' + $routeParams.taskKey + '/edit');
              }, 5000)
            }
            else {
              exitTimer = $timeout(function() {
                $location.path('/project/' + $routeParams.projectKey);
              }, 5000);
            }
          }
          scope.$on('routeChangeStart', function(event, data) {
            if(exitTimer) {
              $timeout.cancel(exitTimer);
            }
          });

          /**
           * Saves a concept to the update merge endpoint, params are passed
           * from the conceptEdit directive
           * @param project
           * @param task
           * @param concept
           */
          scope.conceptUpdateFunction = function (project, task, concept) {
            var deferred = $q.defer();
            console.log(concept);
            terminologyServerService.storeConceptAgainstMergeReview(scope.id, concept.conceptId, concept).then(function (response) {
              deferred.resolve(response);
            }, function (error) {
              deferred.reject(error);
            });
            return deferred.promise;
          };

          /**
           * Constructs a map of componentId -> {source, target, merged} for a
           * single concept triple
           * @param merge
           */
            
          function mapAxiomRelationships(axiom, mappedComponents, type, axiomId){
              angular.forEach(axiom.relationships, function (relationship) {
                if (!mappedComponents.hasOwnProperty(relationship.relationshipId)) {
                  mappedComponents[relationship.relationshipId] = {};
                }
                if(type === 'source'){
                    mappedComponents[relationship.relationshipId].source = relationship;
                }
                else if(type === 'target'){
                    mappedComponents[relationship.relationshipId].target = relationship;
                }
                else if(type === 'merged'){
                    mappedComponents[relationship.relationshipId].merged = relationship;
                }
              });
              return mappedComponents
          }
            
          function mapComponents(merge) {

            // initialize the mapped components array
            var mappedComponents = {};

            // map descriptions for source, target, and autoMerge
            if (merge.sourceConcept) {
              angular.forEach(merge.sourceConcept.descriptions, function (description) {
                if (!mappedComponents.hasOwnProperty(description.descriptionId)) {
                  mappedComponents[description.descriptionId] = {};
                }
                mappedComponents[description.descriptionId].source = description;
              });

              angular.forEach(merge.sourceConcept.relationships, function (relationship) {
                if (!mappedComponents.hasOwnProperty(relationship.relationshipId)) {
                  mappedComponents[relationship.relationshipId] = {};
                }
                mappedComponents[relationship.relationshipId].source = relationship;
              });

              angular.forEach(merge.sourceConcept.classAxioms, function (axiom) {
                if (!mappedComponents.hasOwnProperty(axiom.axiomId)) {
                  mappedComponents[axiom.axiomId] = {};
                }
                //mappedComponents[axiom.axiomId].source = axiom;
                mappedComponents = mapAxiomRelationships(axiom, mappedComponents, 'source', axiom.axiomId);
              });

              angular.forEach(merge.sourceConcept.gciAxioms, function (axiom) {
                if (!mappedComponents.hasOwnProperty(axiom.axiomId)) {
                  mappedComponents[axiom.axiomId] = {};
                }
                //mappedComponents[axiom.axiomId].source = axiom;
                mappedComponents = mapAxiomRelationships(axiom, mappedComponents, 'source', axiom.axiomId);
              });
            }
            
            if (merge.targetConcept) {
              angular.forEach(merge.targetConcept.descriptions, function (description) {
                if (!mappedComponents.hasOwnProperty(description.descriptionId)) {
                  mappedComponents[description.descriptionId] = {};
                }
                mappedComponents[description.descriptionId].target = description;
              });

              angular.forEach(merge.targetConcept.relationships, function (relationship) {
                if (!mappedComponents.hasOwnProperty(relationship.relationshipId)) {
                  mappedComponents[relationship.relationshipId] = {};
                }
                mappedComponents[relationship.relationshipId].target = relationship;
              });

              angular.forEach(merge.targetConcept.classAxioms, function (axiom) {
                if (!mappedComponents.hasOwnProperty(axiom.axiomId)) {
                  mappedComponents[axiom.axiomId] = {};
                }
                //mappedComponents[axiom.axiomId].target = axiom;
                mappedComponents = mapAxiomRelationships(axiom, mappedComponents, 'target', axiom.axiomId);
              });

              angular.forEach(merge.targetConcept.gciAxioms, function (axiom) {
                if (!mappedComponents.hasOwnProperty(axiom.axiomId)) {
                  mappedComponents[axiom.axiomId] = {};
                }
                //mappedComponents[axiom.axiomId].target = axiom;
                 mappedComponents = mapAxiomRelationships(axiom, mappedComponents, 'target', axiom.axiomId);
              });
            }
            
            if (merge.autoMergedConcept) {
              angular.forEach(merge.autoMergedConcept.descriptions, function (description) {
                if (!mappedComponents.hasOwnProperty(description.descriptionId)) {
                  mappedComponents[description.descriptionId] = {};
                }
                mappedComponents[description.descriptionId].merged = description;
              });

              angular.forEach(merge.autoMergedConcept.relationships, function (relationship) {
                if (!mappedComponents.hasOwnProperty(relationship.relationshipId)) {
                  mappedComponents[relationship.relationshipId] = {};
                }
                mappedComponents[relationship.relationshipId].merged = relationship;
              });

              angular.forEach(merge.autoMergedConcept.classAxioms, function (axiom) {
                if (!mappedComponents.hasOwnProperty(axiom.axiomId)) {
                  mappedComponents[axiom.axiomId] = {};
                }
                //mappedComponents[axiom.axiomId].merged = axiom;
                mappedComponents = mapAxiomRelationships(axiom, mappedComponents, 'merged', axiom.axiomId);
              });

              angular.forEach(merge.autoMergedConcept.gciAxioms, function (axiom) {
                if (!mappedComponents.hasOwnProperty(axiom.axiomId)) {
                  mappedComponents[axiom.axiomId] = {};
                }
                //mappedComponents[axiom.axiomId].merged = axiom;
                mappedComponents = mapAxiomRelationships(axiom, mappedComponents, 'merged', axiom.axiomId);
              });
            }

            return mappedComponents;
          }

          /**
           * Constructs a three-component map for conditional highlighting
           * @param merge
           * @returns {{source: {}, target: {}, merged: {}}}
           */
          function highlightChanges(merge) {

            // create blank styling object
            var styles = {
              source: {},
              target: {},
              merged: {}
            };

            // map the components for convenience
            var mappedComponents = mapComponents(merge);
            console.log(mappedComponents);

            // cycle over each discovered componentId and check
            // equality/presence
            for (var key in mappedComponents) {

              var c = mappedComponents[key];

              // Case 1: Source component not present in merged component -->
              // Removed in merge
              if (c.source && !c.merged) {
                styles.source[key] = {message: null, style: 'redhl'};
              }

              // Case 2: Source component present in merged
              if (c.source && c.merged) {

                // Case 2a: Component not present in target --> Added by source
                if (!c.target) {
                  styles.source[key] = {message: null, style: 'bluehl'};
                  styles.merged[key] = {message: null, style: 'bluehl'};
                }

                // Case 2b: Component present in target, but not equal -->
                // Modified by merge Modified by target
                else if (!componentAuthoringUtil.isComponentsEqual(c.source, c.merged)) {
                  styles.source[key] = {message: null, style: 'bluehl'};
                  styles.merged[key] = {message: null, style: 'bluehl'};
                }
              }
              // Case 3: Target component not present in merged component -->
              // Removed in merge
              if (c.target && !c.merged) {
                styles.target[key] = {message: null, styles: 'redhl'};
              }

              // Case 4: Target component present in merged
              if (c.target && c.merged) {

                // Case 4a: Component not present in source --> Added by target
                if (!c.source) {
                  styles.target[key] = {message: null, style: 'tealhl'};
                  styles.merged[key] = {message: null, style: 'tealhl'};
                }

                // Case 4b: Component present in target, but not equal -->
                // Modified by merge Modified by target
                else if (!componentAuthoringUtil.isComponentsEqual(c.target, c.merged)) {
                  styles.target[key] = {message: null, style: 'tealhl'};
                  styles.merged[key] = {message: null, style: 'tealhl'};

                }
              }
            }

            return styles;

          }

          function hasInactiveMergedElements(concept, styles) {            
            if (!concept) {
              return false;
            }

            var fields = (concept.descriptions.concat(concept.relationships)).filter(function (element) {
              if (!element.active && (styles.hasOwnProperty(element.descriptionId) || styles.hasOwnProperty(element.relationshipId))) {
                return true;
              }
            });
            return fields.length > 0;
          }

          function checkForInactiveMergedElements(merge) {
            merge.showInactive = {
              source: hasInactiveMergedElements(merge.sourceConcept, merge.styles.source),
              target: hasInactiveMergedElements(merge.targetConcept, merge.styles.target),
              merged: hasInactiveMergedElements(merge.autoMergedConcept, merge.styles.merged)
            };
          }

          /////////////////////////////////////////////////////
          // Initialization of merge-review functionality
          /////////////////////////////////////////////////////

          // local variable containing the merge poll variable
          var viewedMergePoll = null;

          // on location changes, cancel the poll
          scope.$on('$locationChangeStart', function () {
            console.log('Cancelling viewed merge polling');
            scope.stopMergeReviewPoll();
          });

          /**
           * Starts polling merge review to detect status changes
           */
          scope.startMergeReviewPoll = function () {
            console.log('Starting viewed merge polling');
            viewedMergePoll = $interval(function () {
              terminologyServerService.getMergeReview(scope.id).then(function (response) {
                if (response.status !== 'CURRENT') {
                  viewedMergePoll = $interval.cancel(viewedMergePoll);
                  scope.badStateDetected = true;
                }

              });
            }, 10000);
          };

          /**
           * Stops the merge review polling
           */
          scope.stopMergeReviewPoll = function () {
            if (viewedMergePoll) {
              viewedMergePoll = $interval.cancel(viewedMergePoll);
            }
          };

          // local variable containing map of conceptId -> {source, target,
          // merged concepts}
          var conceptMap = {};

          scope.viewConflict = function (conflict) {

            // if viewed, do not add
            if (!conflict.viewed) {
              if (!scope.viewedMerges) {
                scope.viewedMerges = [];
              }

              scope.viewedMerges.push(conflict);
              conflict.viewed = true;
            }
          };

          scope.$on('stopEditing', function (event, data) {

            // find the merge matching this id and remove it from viewed list
            for (var i = 0; i < scope.viewedMerges.length; i++) {
              if (scope.viewedMerges[i].conceptId === data.concept.conceptId) {
                scope.viewedMerges.splice(i, 1);
                break;
              }
            }

            // find the conflict matching this id and mark it unviewed
            angular.forEach(scope.conflicts, function (conflict) {
              if (conflict.conceptId === data.concept.conceptId) {
                conflict.viewed = false;
              }
            });

            // if no viewed concepts, ensure sidebar open
            if (scope.viewedMerges.length === 0) {
              scope.hideSidebar = false;
            }
          });
            
          function deDuplicateConflict(conflict){
              var deferred = $q.defer();
              conflict.autoMergedConcept.classAxioms = [];
              conflict.autoMergedConcept.gciAxioms = [];
              
              if(conflict.sourceConcept) {
                angular.forEach(conflict.sourceConcept.classAxioms, function(axiom){
                  let newAxiom = {};
                  angular.copy(axiom, newAxiom);
                  angular.forEach(conflict.targetConcept.classAxioms, function(secondAxiom){
                    if(axiom.axiomId === secondAxiom.axiomId){
                        angular.forEach(secondAxiom.relationships, function(relationship){
                            let relationshipFound = false;
                            angular.forEach(newAxiom.relationships, function(newAxiomRelationship){
                                if(newAxiomRelationship.relationshipId === relationship.relationshipId){
                                    relationshipFound = true;
                                }
                            })
                            if(!relationshipFound){
                                newAxiom.relationships.push(relationship);
                            }
                        })
                    }
                  });
                  conflict.autoMergedConcept.classAxioms.push(newAxiom);
                });

                angular.forEach(conflict.sourceConcept.gciAxioms, function(axiom){
                  let newAxiom = {};
                  angular.copy(axiom, newAxiom);
                  angular.forEach(conflict.targetConcept.gciAxioms, function(secondAxiom){
                    if(axiom.axiomId === secondAxiom.axiomId){
                        angular.forEach(secondAxiom.relationships, function(relationship){
                            let relationshipFound = false;
                            angular.forEach(newAxiom.relationships, function(newAxiomRelationship){
                                if(newAxiomRelationship.relationshipId === relationship.relationshipId){
                                    relationshipFound = true;
                                }
                            })
                            if(!relationshipFound){
                                newAxiom.relationships.push(relationship);
                            }
                        })
                    }
                  });
                  conflict.autoMergedConcept.gciAxioms.push(newAxiom);
                });
              }              
              deferred.resolve(conflict);

              return deferred.promise;
          }
            
          function assignAxiomPartIds(conflict){
            if(conflict.sourceConcept) {
              angular.forEach(conflict.sourceConcept.classAxioms, function(axiom){
                angular.forEach(axiom.relationships, function(relationship){
                    relationship.relationshipId = axiom.axiomId + '_' + relationship.groupId + '_' + relationship.type.conceptId + '_' + relationship.target.conceptId;
                })
              });
              angular.forEach(conflict.sourceConcept.gciAxioms, function(axiom){
                  angular.forEach(axiom.relationships, function(relationship){
                      relationship.relationshipId = axiom.axiomId + '_' + relationship.groupId + '_' + relationship.type.conceptId + '_' + relationship.target.conceptId;
                  })
              });
            }
            if(conflict.targetConcept) {
              angular.forEach(conflict.targetConcept.classAxioms, function(axiom){
                angular.forEach(axiom.relationships, function(relationship){
                    relationship.relationshipId = axiom.axiomId + '_' + relationship.groupId + '_' + relationship.type.conceptId + '_' + relationship.target.conceptId;
                })
              });
              angular.forEach(conflict.targetConcept.gciAxioms, function(axiom){
                  angular.forEach(axiom.relationships, function(relationship){
                      relationship.relationshipId = axiom.axiomId + '_' + relationship.groupId + '_' + relationship.type.conceptId + '_' + relationship.target.conceptId;
                  })
              });
            }  
            if(conflict.autoMergedConcept) {
              angular.forEach(conflict.autoMergedConcept.classAxioms, function(axiom){
                angular.forEach(axiom.relationships, function(relationship){
                    relationship.relationshipId = axiom.axiomId + '_' + relationship.groupId + '_' + relationship.type.conceptId + '_' + relationship.target.conceptId;
                })
              });
              angular.forEach(conflict.autoMergedConcept.gciAxioms, function(axiom){
                  angular.forEach(axiom.relationships, function(relationship){
                      relationship.relationshipId = axiom.axiomId + '_' + relationship.groupId + '_' + relationship.type.conceptId + '_' + relationship.target.conceptId;
                  })
              });
            } 
          }

          function initializeMergeReview(review) {

            console.log('Initializing merge review with id' + review.id);

            // set the ui state -- note, have to add apostrophes to prevent
            // javascript interpreting as mathematical operation (due to UUID
            // idstructure)
            if ($routeParams.taskKey) {
              scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'merge-review', '"' + review.id + '"');
            } else {
              scaService.saveUiStateForUser($routeParams.projectKey + '-merge-review', '"' + review.id + '"');
            }

            scope.id = review.id;

            // check if FAILED
            if (review.status === 'FAILED') {
              notificationService.sendError('ERROR: Merge review generation failed.');
            }

            // Check for deleted concepts
            angular.forEach(review, function (conceptReview) {
              if (!conceptReview.sourceConcept) {
                var concept = conceptReview.targetConcept;
                notificationService.sendError("Concept " + concept.conceptId + " | " + concept.fsn + " has been updated on this branch " +
                  "but deleted on the parent branch. Please contact technical support to get help resolving this.");
                return;
              }
              if (!conceptReview.targetConcept) {
                var concept = conceptReview.sourceConcept;
                notificationService.sendError("Concept " + concept.conceptId + " | " + concept.fsn + " has been updated on the parent branch " +
                  "but deleted on this branch. Please contact technical support to get help resolving this");
                return;
              }
            });


            // intiialize the list of conflicts for tabular display
            scope.conflicts = [];

            // initialize the conditional highlighting map (conceptId ->
            // {target -> styles, source -> styles, merged -> styles))
            scope.styles = {};

            scope.conflicts = review;

            angular.forEach(scope.conflicts, function (conflict) {
              assignAxiomPartIds(conflict);
              deDuplicateConflict(conflict).then(function (deDupedConflict){
                conflict = deDupedConflict;
                conflict.fsn = conflict.sourceConcept ? conflict.sourceConcept.fsn : conflict.targetConcept.fsn;
                conflict.conceptId = conflict.sourceConcept ? conflict.targetConcept.conceptId : conflict.targetConcept.conceptId;
                conflict.styles = highlightChanges(conflict);
                checkForInactiveMergedElements(conflict);
              });
            });

            // get previously accepted merges, if they exist, and apply to
            // conflicts
            if ($routeParams.taskKey) {
              scaService.getUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'merges-accepted-' + scope.id).then(function (mergesAccepted) {
                if (!mergesAccepted) {
                  mergesAccepted = [];
                }
                angular.forEach(scope.conflicts, function (conflict) {
                  if (mergesAccepted.indexOf(conflict.conceptId) !== -1) {
                    conflict.accepted = true;
                  }
                });

                // load the tables
                scope.conflictsToReviewTableParams.reload();
                scope.conflictsAcceptedTableParams.reload();
              });
            }

            // if project, just load tables
            else {

              scaService.getUiStateForUser($routeParams.projectKey + '-merges-accepted-' + scope.id).then(function (mergesAccepted) {
                if (!mergesAccepted) {
                  mergesAccepted = [];
                }
                angular.forEach(scope.conflicts, function (conflict) {
                  if (mergesAccepted.indexOf(conflict.conceptId) !== -1) {
                    conflict.accepted = true;
                  }
                });

                // load the tables
                scope.conflictsToReviewTableParams.reload();
                scope.conflictsAcceptedTableParams.reload();
              });
            }

            // start polling to detect changes in status of merge-review
            scope.startMergeReviewPoll();
          }

          function rebase(mergeReviewId) {
            console.log('Rebasing ' + (scope.sourceBranch + ' ' + scope.targetBranch));
            scope.rebaseRunning = true;
            var onSuccess = function(response) {
              if (response.status === 'COMPLETED') {

                // Run branch integrity check
                var branch = metadataService.getBranch();
                terminologyServerService.branchIntegrityCheck(branch).then(function(response) {
                  if (response && response.empty == false) {
                    notificationService.sendError('Component integrity issues found. Please contact technical support. ' + JSON.stringify(response));
                  } else {
                    scope.rebaseRunning = false;
                    scope.rebaseComplete = true;
                    scope.warning = false;
                    scope.fiveOFour = false;

                    // switch to edit view on success
                    exitConflictsView();
                  }
                }, function(error) {
                  notificationService.sendError('Branch integrity check failed. ' + error);
                });
              } else if (response.status === 'CONFLICTS') {
                scope.rebaseRunning = false;
                scope.conflicts = [];
                var merge = JSON.parse(response.message);
                terminologyServerService.fetchConflictMessage(merge).then(function(conflictMessage) {
                  notificationService.sendError(conflictMessage);
                });
              } else {
                // NOTE: Do not switch to edit view on warning
                // TODO Need to revisit this
                if ($routeParams.taskKey) {
                  notificationService.sendError('Error pulling changes from project: ' + response.message);
                } else {
                  notificationService.sendError('Error pulling changes from mainline content: ' + response.message);
                }
              }
            }

            var onError = function(error) {
              scope.rebaseRunning = false;
              scope.rebaseComplete = false;
              scope.warning = true;
              scope.fiveOFour = false;

              if ($routeParams.taskKey) {
                notificationService.sendError('Error pulling changes from project: ' + error);
              } else {
                notificationService.sendError('Error pulling changes from mainline content: ' + error);
              }
            }

            terminologyServerService.synchronousMerge(scope.sourceBranch, scope.targetBranch, mergeReviewId).then(onSuccess, onError);
          }

          /* ON LOAD PROCESS
           (1) Check if saved ui-state for merge-review id exists, and if so, get details
           (1a) if details are present, with concepts returned, merge review is current. Display the results and stop
           (1b) if review not current (1a fails), review is not current.  Continue.
           (2) Generate a merge review for this source/target pair
           (2a) If merge review returns empty (no concepts), rebase
           (2b) If merge review returns with concepts, switch to merge resolution view.
           */

          function getReviewStatusAndInitialize(mergeReviewId) {

            // if ui-state has merge review id from previous visit
            if (mergeReviewId) {

              terminologyServerService.getMergeReviewDetails(mergeReviewId).then(function (mergeReview) {
                  console.log(mergeReview);
                // Previous review is current and has concepts,
                // initialize from this review
                if (mergeReview && mergeReview.length > 0) {
                  initializeMergeReview(mergeReview);
                }

                // Previous review is not current, generate new review
                // and initialize from new review
                else {
                  terminologyServerService.generateMergeReview(scope.sourceBranch, scope.targetBranch).then(function (newReview) {

                    if (newReview && newReview.length > 0) {
                      initializeMergeReview(newReview);
                    } else {
                      rebase(); 
                    }
                  }, function (error) {
                    if (error) {
                      notificationService.sendError('Conflicts: ' + error);
                    } else {
                      notificationService.sendError('Error generating merge review.');
                    }
                  });
                }

              }, function(error){
                  terminologyServerService.generateMergeReview(scope.sourceBranch, scope.targetBranch).then(function (newReview) {

                    // DIVERGED, but no merges to resolve
                    if (!newReview || newReview.length === 0) {
                      rebase();
                    }

                    // DIVERGED, with merges to resolve
                    else {
                      initializeMergeReview(newReview);
                    }
                  }, function (error) {
                    if (error) {
                      notificationService.sendError('Conflicts: ' + error);
                    } else {
                      notificationService.sendError('Error generating merge review.');
                    }
                  });
              });
            }

            // if no review or review not current, generate new merge
            // review
            else {
              terminologyServerService.generateMergeReview(scope.sourceBranch, scope.targetBranch).then(function (newReview) {

                // DIVERGED, but no merges to resolve
                if (!newReview || newReview.length === 0) {
                  rebase();
                }

                // DIVERGED, with merges to resolve
                else {
                  initializeMergeReview(newReview);
                }
              }, function (error) {
                if (error) {
                  notificationService.sendError('Conflicts: ' + error);
                } else {
                  notificationService.sendError('Error generating merge review.');
                }
              });
            }
          }

          scope.badStateDetected = false;

          // attempt to finalize merges
          scope.finalizeMerges = function () {

            // cancel polling
            scope.stopMergeReviewPoll();

            notificationService.sendMessage('Applying merged changes....');

            terminologyServerService.mergeAndApply(scope.id).then(function (response) {
              notificationService.sendMessage('Merges successfully applied', 5000);

              // ensure bad state is not triggered
              scope.badStateDetected = false;

              // set flag for finalized merge
              scope.rebaseComplete = true;

              // clear the conflicts list -- no further changes are
              // permissible
              scope.conflicts = null;

              // set flag to indicate that conflicts were resolved and
              // accepted
              scope.rebaseWithMerges = true;

              // remove from UI state
              if ($routeParams.taskKey) {
                scaService.deleteUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'merge-review');
              } else {
                scaService.deleteUiStateForUser($routeParams.projectKey + '-merge-review');
              }

              // TODO This is currently non-functional -- there are no listeners in conflict mode
              // Instead, re-routing to edit view after slight delay to force task reload
              $rootScope.$broadcast('reloadTask');
              exitConflictsView();
            }, function (error) {
              if (error !== null && error !== 1) {
                scope.rebaseRunning = false;
                scope.rebaseComplete = true;
                scope.warning = false;
                scope.fiveOFour = false;

                // broadcast reload task to any current listeners, to pull in
                // new branch state
                $rootScope.$broadcast('reloadTask');
              }
              else if (error === 1) {
                scope.rebaseRunning = false;
                scope.rebaseComplete = false;
                scope.warning = false;
                scope.fiveOFour = true;
              }
              else {
                scope.rebaseRunning = false;
                scope.rebaseComplete = false;
                scope.warning = true;
                scope.fiveOFour = false;
              }
            });
          };

          scope.reloadRoute = function () {
            window.location.reload();
          };

          // on load, check ui-state for previously viewed merge review id
          scope.initialize = function () {

            // cancel the poll if it is currently running
            scope.stopMergeReviewPoll();

            // set bad state detection to false
            scope.badStateDetected = false;

            // the list of conflicts (id, fsn, viewed)
            scope.conflicts = null;

            // the viewed merges (source, merge, target concepts)
            scope.viewedMerges = [];

            // the persisted (ui-state) list of concepts accepted
            scope.acceptedConceptIds = [];

            // status flags
            scope.mergesComplete = false; // true if all merge concepts have
                                          // been accepted
            scope.rebaseRunning = false; // true if rebase has been triggered
                                         // when no conflicts were detected
            scope.rebaseComplete = false; // true if either (a) rebase with no
                                          // conflicts complete, or (b) rebase
                                          // with accepted merges is complete

            // Parameter to show or hide the sidebar table
            scope.hideSidebar = false;

            scope.actionTab = 1;

            setTimeout(function waitForFetchingBranchRoot() {              
              if (metadataService.getBranch()) {
                if ($routeParams.taskKey) {
                  scope.targetBranch = metadataService.getBranchRoot() + '/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
                  scope.sourceBranch = metadataService.getBranchRoot() + '/' + $routeParams.projectKey;
                } else {
                  scope.targetBranch = metadataService.getBranchRoot() + '/' + $routeParams.projectKey;
                  scope.sourceBranch = metadataService.getBranchRoot();
                }
                terminologyServerService.getBranch(scope.targetBranch).then(function(response) {
                  if (response && response.state && response.state === 'BEHIND') {
                    rebase();
                  } else {
                    if ($routeParams.taskKey) {
                      scaService.getUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'merge-review').then(function (mergeReviewId) {
                        getReviewStatusAndInitialize(mergeReviewId);
                      });
                    } else {
                      scaService.getUiStateForUser($routeParams.projectKey + '-merge-review').then(function (mergeReviewId) {
                        getReviewStatusAndInitialize(mergeReviewId);
                      });
                    }
                  }                  
                }, function(error) {
                  console.error('Error while determine branch state. Error: ' + error);
                })
                
              } else {
                setTimeout(waitForFetchingBranchRoot, 100);
              }
            }, 100);            
          };

          scope.initialize();

        }
      }
        ;
    }])
;
