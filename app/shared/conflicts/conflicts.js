'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('conflicts', ['$rootScope', 'ngTableParams', '$routeParams', '$filter', '$interval', '$timeout', '$modal', '$compile', '$sce', 'scaService', 'objectService', 'snowowlService', 'notificationService', '$q',
    function ($rootScope, NgTableParams, $routeParams, $filter, $interval, $timeout, $modal, $compile, $sce, scaService, objectService, snowowlService, notificationService, $q) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {

          conflictsContainer: '=',

          // branch this conflict report was generated against
          sourceBranch: '=',

          // branch this conflict report was generated for
          targetBranch: '='

        },
        templateUrl: 'shared/conflicts/conflicts.html',

        link: function (scope) {

          // the list of conflicts (id, fsn, viewed)
          scope.conflicts = null;

          // the viewed merges (source, merge, target concepts)
          scope.viewedMerges = [];

          // the persisted (ui-state) list of concepts accepted
          scope.acceptedConceptIds = [];

          // status flags
          scope.mergesComplete = false; // true if all merge concepts have been accepted
          scope.rebaseRunning = false; // true if rebase has been triggered when no conflicts were detected
          scope.rebaseComplete = false; // true if either (a) rebase with no conflicts complete, or (b) rebase with accepted merges is complete

         

          // Parameter to show or hide the sidebar table
          scope.hideSidebar = false;
          scope.toggleSidebar = function () {
            scope.hideSidebar = !scope.hideSidebar;
          };

          scope.actionTab = 1;

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

                console.debug('conflictsTableParams getData', concepts);

                if (!concepts) {
                  $defer.resolve([]);
                } else {

                  params.total(concepts.length);
                  concepts = params.sorting() ? $filter('orderBy')(concepts, params.orderBy()) : concepts;
                  concepts = concepts.slice((params.page() - 1) * params.count(), params.page() * params.count());
                  console.debug('concepts to review page', concepts);

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

                console.debug('conflictsTableParams getData', concepts);

                if (!concepts) {
                  $defer.resolve([]);
                } else {

                  params.total(concepts.length);
                  concepts = params.sorting() ? $filter('orderBy')(concepts, params.orderBy()) : concepts;
                  concepts = concepts.slice((params.page() - 1) * params.count(), params.page() * params.count());
                  console.debug('concepts accepted page', concepts);
                  $defer.resolve(concepts);
                }
              }
            }
          );

          scope.$on('acceptMerge', function (event, data) {

            console.debug('acceptMerge event', data);

            if (!data.concept) {
              console.error('AcceptMerge event must have concept attached');
              return;
            }
            if (!data.validationResults || !data.validationResults.errors || !data.validationResults.warnings) {
              console.error('AcceptMerge event must have validation results (empty or non-empty) attached')
              return;
            }

            if (Object.keys(data.validationResults.errors).length > 0) {
              console.sendError('Cannot accept merge due to convention errors');
            } else {

              notificationService.sendMessage('Accepting merged version for concept ' + data.concept.fsn);
              scope.conceptUpdateFunction($routeParams.projectKey, $routeParams.taskKey, data.concept).then(function (response) {
                notificationService.sendMessage('Merge accepted for concept ' + data.concept.fsn, 5000);

                // mark the conflict as accepted
                angular.forEach(scope.conflicts, function (conflict) {
                  if (conflict.id === data.concept.conceptId) {
                    conflict.accepted = true

                    // update the ui state
                    if (scope.acceptedConceptIds.indexOf(conflict.id)) {
                      scope.acceptedConceptIds.push(conflict.id);
                      scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'merges-accepted', scope.acceptedConceptIds);
                    }
                  }
                });

                // remove the concept from the viewed list (use the $on
                // statement in this file) -- only if no errors detected,
                // otherwise leave the concept in editing to display warnings
                if (Object.keys(data.validationResults.warnings).length === 0) {
                  $rootScope.$broadcast('stopEditing', {concept: data.concept});
                } else {
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
            snowowlService.storeConceptAgainstMergeReview(scope.id, concept.conceptId, concept).then(function (response) {
              deferred.resolve(response);
            }, function (error) {
              deferred.reject(error);
            });
            return deferred.promise;
          };

          /**
           * Constructs a map of componentId -> {source, target, merged}
           * @param merge
           */
          function mapComponents(merge) {

            // initialize the mapped components array
            var mappedComponents = {};

            // map descriptions
            angular.forEach(merge.source.descriptions, function (description) {
              if (!mappedComponents.hasOwnProperty(description.descriptionId)) {
                mappedComponents[description.descriptionId] = {};
              }
              mappedComponents[description.descriptionId].source = description;
            });

            angular.forEach(merge.target.descriptions, function (description) {
              if (!mappedComponents.hasOwnProperty(description.descriptionId)) {
                mappedComponents[description.descriptionId] = {};
              }
              mappedComponents[description.descriptionId].target = description;
            });

            angular.forEach(merge.merged.descriptions, function (description) {
              if (!mappedComponents.hasOwnProperty(description.descriptionId)) {
                mappedComponents[description.descriptionId] = {};
              }
              mappedComponents[description.descriptionId].merged = description;
            });

            // map relationships
            angular.forEach(merge.source.relationships, function (relationship) {
              if (!mappedComponents.hasOwnProperty(relationship.relationshipId)) {
                mappedComponents[relationship.relationshipId] = {};
              }
              mappedComponents[relationship.relationshipId].source = relationship;
            });

            angular.forEach(merge.target.relationships, function (relationship) {
              if (!mappedComponents.hasOwnProperty(relationship.relationshipId)) {
                mappedComponents[relationship.relationshipId] = {};
              }
              mappedComponents[relationship.relationshipId].target = relationship;
            });

            angular.forEach(merge.merged.relationships, function (relationship) {
              if (!mappedComponents.hasOwnProperty(relationship.relationshipId)) {
                mappedComponents[relationship.relationshipId] = {};
              }
              mappedComponents[relationship.relationshipId].merged = relationship;
            });

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

            // console.debug('mapped components', mappedComponents);

            // cycle over each discovered componentId and check
            // equality/presence
            for (var key in mappedComponents) {

              var c = mappedComponents[key];

              // console.debug('----------------------');
              // console.debug('Checking components:', c);
              // console.debug('----------------------');

              // Case 1: Source component not present in merged component -->
              // Removed in merge
              if (c.source && !c.merged) {
                // console.debug('key -> case 1');
                styles.source[key] = {message: null, style: 'redhl'};
              }

              // Case 2: Source component present in merged
              if (c.source && c.merged) {

                // Case 2a: Component not present in target --> Added by source
                if (!c.target) {
                  // console.debug('key -> case 2a');
                  styles.source[key] = {message: null, style: 'yellowhl'};
                  styles.merged[key] = {message: null, style: 'yellowhl'};
                }

                // Case 2b: Component present in target, but not equal -->
                // Modified by merge Modified by target
                else if (!objectService.isComponentsEqual(c.source, c.merged)) {
                  // console.debug('key -> case 2b');
                  styles.source[key] = {message: null, style: 'yellowhl'};
                  styles.merged[key] = {message: null, style: 'yellowhl'};
                }
              }
              // Case 3: Target component not present in merged component -->
              // Removed in merge
              if (c.target && !c.merged) {
                // console.debug('key -> case 3');
                styles.target[key] = {message: null, styles: 'redhl'};
              }

              // Case 4: Target component present in merged
              if (c.target && c.merged) {

                // Case 4a: Component not present in source --> Added by target
                if (!c.source) {
                  // console.debug('key -> case 4a');
                  styles.target[key] = {message: null, style: 'orangehl'};
                  styles.merged[key] = {message: null, style: 'orangehl'};
                }

                // Case 4b: Component present in target, but not equal -->
                // Modified by merge Modified by target
                else if (!objectService.isComponentsEqual(c.target, c.merged)) {
                  // console.debug('key -> case 4b');
                  styles.target[key] = {message: null, style: 'orangehl'};
                  styles.merged[key] = {message: null, style: 'orangehl'};
                }
              }
            }

            // console.debug('styles after concept calculation', styles);
            return styles;

          }

          /////////////////////////////////////////////////////
          // Initialization of merge-review functionality
          /////////////////////////////////////////////////////

          // local variable containing the merge poll variable
          var viewedMergePoll = null;

          // local variable containing map of conceptId -> {source, target,
          // merged concepts}
          var conceptMap = {};

          scope.finalizeMerges = function () {

            // cancel polling
            viewedMergePoll = $interval.cancel(viewedMergePoll);

            notificationService.sendMessage('Applying merged changes....');
            snowowlService.mergeAndApply(scope.sourceBranch, scope.targetBranch, scope.id).then(function (response) {
              notificationService.sendMessage('Merges successfully applied', 5000);

              // set flag for finalized merge
              scope.rebaseComplete = true;
              $rootScope.$broadcast('reloadTask');
            }, function (error) {
              notificationService.sendError('Error applying merges: ' + error);
            })
          };

          scope.viewConflict = function (conflict) {

            // if viewed, do not add
            if (!conflict.viewed) {
              if (!scope.viewedMerges) {
                scope.viewedMerges = [];
              }
              scope.viewedMerges.push(conflict.data);
              conflict.viewed = true;
            }

            console.debug('viewedMerges', scope.viewedMerges);
          };

          scope.$on('stopEditing', function (event, data) {

            // find the merge matching this id and remove it from viewed list
            for (var i = 0; i < scope.viewedMerges.length; i++) {
              if (scope.viewedMerges[i].merged.conceptId === data.concept.conceptId) {
                scope.viewedMerges.splice(i, 1);
                break;
              }
            }

            // find the conflict matching this id and mark it unviewed
            angular.forEach(scope.conflicts, function (conflict) {
              if (conflict.id === data.concept.conceptId) {
                conflict.viewed = false;
              }
            });

            // if no viewed concepts, ensure sidebar open
            if (scope.viewedMerges.length === 0) {
              scope.hideSidebar = false;
            }
          });

          function initializeMergeReview(review) {

            // set the ui state -- note, have to add apostrophes to prevent
            // javascript interpreting as mathematical operation (due to UUID
            // structure)
            scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'merge-review', '"' + review.id + '"');

            scope.id = review.id;

            // intiialize the list of conflicts for tabular display
            scope.conflicts = [];

            // initialize the conditional highlighting map (conceptId ->
            // {target -> styles, source -> styles, merged -> styles))
            scope.styles = {};

            ///////////////////////////////////////////
            // Cycle over each type and add to map
            ////////////////////////////////////////////

            // add all source concepts
            angular.forEach(review.sourceChanges, function (concept) {
              if (!conceptMap.hasOwnProperty(concept.conceptId)) {
                conceptMap[concept.conceptId] = {
                  conceptId: concept.conceptId,
                  fsn: concept.fsn
                };
              }
              conceptMap[concept.conceptId].source = concept;
            });

            // add all target concepts
            angular.forEach(review.targetChanges, function (concept) {
              if (!conceptMap.hasOwnProperty(concept.conceptId)) {
                conceptMap[concept.conceptId] = {
                  conceptId: concept.conceptId,
                  fsn: concept.fsn
                };
              }
              conceptMap[concept.conceptId].target = concept;
            });

            // add all merged concepts
            angular.forEach(review.mergedChanges, function (concept) {
              if (!conceptMap.hasOwnProperty(concept.conceptId)) {
                conceptMap[concept.conceptId] = {
                  conceptId: concept.conceptId,
                  fsn: concept.fsn
                };
              }
              conceptMap[concept.conceptId].merged = concept;
            });

            for (var key in conceptMap) {

              var concept = conceptMap[key];

              // construct list of conflicts for ng-table display
              var conflict = {
                id: concept.conceptId,
                fsn: concept.fsn,
                viewed: false,
                accepted: false, // TODO Use ui-state for this
                data: conceptMap[key]
              };

              // push to conflicts list
              scope.conflicts.push(conflict);

              // calculate merge changes
              concept.styles = highlightChanges(concept);
            }

            console.debug('viewedMerges', scope.viewedMerges);
            console.debug('conflicts', scope.conflicts);
            console.debug('styles', scope.styles);

            // get previously accepted merges, if they exist, and apply to
            // conflicts
            scaService.getUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'merges-accepted').then(function (mergesAccepted) {
              if (!mergesAccepted) {
                mergesAccepted = [];
              }
              angular.forEach(scope.conflicts, function (conflict) {
                if (mergesAccepted.indexOf(conflict.id) !== -1) {
                  conflict.accepted = true;
                }
              });

              // load the tables
              scope.conflictsToReviewTableParams.reload();
              scope.conflictsAcceptedTableParams.reload();
            });

            // start polling to detect changes in status of merge-review
            viewedMergePoll = $interval(function () {
              snowowlService.getMergeReview(review.id).then(function (response) {
                if (response.status !== 'CURRENT') {
                  notificationService.sendWarning('Merge review is no longer current; pull project changes in and start again');
                  viewedMergePoll = $interval.cancel(viewedMergePoll);
                }
              })
            }, 10000);
          }

          function rebase() {
            console.debug('Rebasing');
            scope.rebaseRunning = true;

            if ($routeParams.taskKey) {
              scaService.rebaseTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
                scope.rebaseRunning = false;
                scope.rebaseComplete = true;

                // broadcast reload task to any current listeners, to pull in new branch state
                $rootScope.$broadcast('reloadTask');

              }, function(error) {
                scope.rebaseRunning = false;
                scope.rebaseComplete = false;
                notificationService.sendError('Error pulling changes from project: ' + error);
              });
            } else {
              scaService.rebaseProject($routeParams.projectKey).then(function(response) {
                // TODO Implement for project level
              })
            }
          }

          /* ON LOAD PROCESS
           (1) Check if saved ui-state for merge-review id exists, and if so, get details
           (1a) if details are present, with concepts returned, merge review is current. Display the results and stop
           (1b) if review not current (1a fails), review is not current.  Continue.
           (2) Generate a merge review for this source/target pair
           (2a) If merge review returns empty (no concepts), rebase
           (2b) If merge review returns with concepts, switch to merge resolution view.
           */

          // on load, check ui-state for merge review id
          // TODO Ui-State saving will not work with projects, resulting in
          // re-generation of reviews on every load
          scaService.getUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'merge-review').then(function (mergeReviewId) {

              // (2) if ui-state has merge review id from previous visit
              if (mergeReviewId) {

                console.debug('Previous merge-review exists with id: ' + mergeReviewId);

                snowowlService.getMergeReviewDetails(mergeReviewId).then(function (mergeReview) {

                  // (2a) Previous review is current and has concepts,
                  // initialize from this review
                  if (mergeReview && mergeReview.mergedChanges) {
                    console.debug('Previous merge-review is current');
                    initializeMergeReview(mergeReview);
                  }

                  // (2b) Previous review is not current, generate new review
                  // and initialize from new review
                  else {
                    console.debug('Previous merge-review is not current, generating new merge-review');
                    snowowlService.generateMergeReview(scope.sourceBranch, scope.targetBranch).then(function (newReview) {
                      initializeMergeReview(newReview);
                    }, function (error) {
                      notificationService.sendError('Error generating merge review');
                    });
                  }

                });
              }

              // (3) if no review or review not current, generate new merge
              // review
              else {
                console.debug('No review ui-state, generating new merge-review');
                snowowlService.generateMergeReview(scope.sourceBranch, scope.targetBranch).then(function (newReview) {

                  // (3a) DIVERGED, but no merges to resolve
                  if (!newReview || !newReview.mergedChanges) {
                    rebase();
                  }

                  // (3b) DIVERGED, with merges to resolve
                  else {
                    initializeMergeReview(newReview);
                  }
                }, function (error) {
                  notificationService.sendError('Error generating merge review');
                });
              }
            }
          )
          ;

        }
      }
    }])
;