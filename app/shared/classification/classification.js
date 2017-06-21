'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('classification', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'accountService', 'snowowlService', 'scaService', 'notificationService', '$timeout', '$interval',
    function ($rootScope, $filter, NgTableParams, $routeParams, accountService, snowowlService, scaService, notificationService, $timeout, $interval) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {

          // the classifihcation container
          // {equivalentConcepts : {...}, relationshipChanges: {...}, ...}
          classificationContainer: '=',

          // the branch
          branch: '=branch',

          // the task (optional)
          task : '=?'
        },
        templateUrl: 'shared/classification/classification.html',

        link: function (scope, element, attrs, linkCtrl) {

          scope.editable = attrs.editable === 'true';

          // local concept-edit and model list
          scope.viewedConcepts = [];

          scope.statusText = 'Loading...';

          scope.errorState = false;

          scope.itemLimit = 1000;


          // function to get formatted summary tex
          scope.setStatusText = function () {

            // check required elements
            if (!scope.classificationContainer) {
              return;
            }
            if (!scope.classificationContainer.status || scope.classificationContainer.status === '') {
              return;
            }

            switch (scope.classificationContainer.status) {
              case 'COMPLETED':
              case 'SAVING_IN_PROGRESS':
              case 'SAVED':
                scope.statusText = 'Classifier finished at ' + scope.classificationContainer.completionDate;
                break;
              case 'RUNNING':
                scope.statusText = 'Running...';
                break;
              default:
                scope.statusText = scope.classificationContainer.status.toLowerCase().replace(/\w\S*/g, function (txt) {
                  return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                }).replace(/_/g, ' ');
            }
          };

          $rootScope.$on('stopEditing', function (event, data) {
            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === data.concept.conceptId) {

                scope.viewedConcepts.splice(i, 1);
                return;
              }
            }
          });

          /**
           * Watch for view concept requests from classificationReport
           */
          scope.$on('viewClassificationConcept', function (event, data) {
            scope.viewConcept(data.conceptId);
          });

          /**
           * Add concept to viewed list
           * @param conceptId
           */
          scope.viewConcept = function (conceptId) {

            // check if concept already exists in list
            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === conceptId) {
                notificationService.sendWarning('Concept already shown');
                return;
              }
            }

            notificationService.sendMessage('Retrieving concept before & after information...');

            // construct an object with before and after concept models
            var conceptModelObj = {
              conceptId: conceptId,
              conceptBefore: null,
              conceptAfter: null
            };

            // get the full concept for this branch (before version)
            snowowlService.getFullConcept(conceptId, scope.branch).then(function (response) {

              conceptModelObj.fsn = response.fsn;

              // set the before concept
              conceptModelObj.conceptBefore = response;

              // get the model preview (after version)
              if (scope.classificationContainer.status !== 'SAVED') {
                snowowlService.getModelPreview(scope.classificationContainer.id, scope.branch, conceptId).then(function (secondResponse) {
                  conceptModelObj.conceptAfter = secondResponse;

                  scope.viewedConcepts.push(conceptModelObj);
                  notificationService.clear();

                  // after a slight delay, broadcast a draw and taxonomy
                  // request event
                  $timeout(function () {
                    $rootScope.$broadcast('comparativeModelDraw');
                    scope.viewConceptInTaxonomy(conceptModelObj.conceptBefore);
                  }, 500);
                });
              } else {
                scope.viewedConcepts.push(conceptModelObj);
                notificationService.clear();

                // after a slight delay, broadcast a draw event
                $timeout(function () {
                  $rootScope.$broadcast('comparativeModelDraw');
                  scope.viewConceptInTaxonomy(conceptModelObj.conceptBefore);
                }, 500);
              }
            });

          };

          var resizeClassificationSvg = function (concept, id) {
            var elem = document.getElementById('#' + concept.conceptId);
            var parentElem = document.getElementById('drawModel' + concept.conceptId);

            if (!elem || !parentElem) {
              return;
            }

            // set the height and width
            var width = parentElem.offsetWidth - 30;
            var height = $('#editPanel-' + id).find('.editHeightSelector').height() + 41;
            if (width < 0) {
              return;
            }
            console.log(elem);

            elem.setAttribute('width', width);
            elem.setAttribute('height', height);
          };

          // creates element for dialog download of classification data
          scope.dlcDialog = (function (data, fileName) {

            // create the hidden element
            var a = document.createElement('a');
            document.body.appendChild(a);

            return function (data, fileName) {
              var
                blob = new Blob([data], {type: 'text/csv'}),
                url = window.URL.createObjectURL(blob);
              a.href = url;
              a.download = fileName;
              a.click();
              window.URL.revokeObjectURL(url);
            };
          }());

          /**
           * Helper function called after saveClassification determines whether
           * task/project eligible
           */
          function saveClassificationHelper() {
            snowowlService.saveClassification(scope.branch, scope.classificationContainer.id).then(function (data) {
              if (!data) {
                notificationService.sendError('Saving classification aborted', 0);
              } else {

                // start polling
                scope.startSavingClassificationPolling();

                // broadcast reload notification to edit.js after short timeout
                $timeout(function () {
                  if ($routeParams.taskKey) {
                    $rootScope.$broadcast('reloadTask');
                  } else {
                    $rootScope.$broadcast('reloadProject');
                  }
                }, 500);
              }
            });
          }

          /**
           * Scope function called when user clicks Accept Classification
           * Results
           */
          scope.saveClassification = function () {
            notificationService.sendMessage('Saving classification....');

            // perform quick check to ensure task or project are not diverged
            // TODO This is inelegant, should reconsider
            var canSave = true;
            if ($routeParams.taskKey) {
              saveClassificationHelper();
            } else {
              saveClassificationHelper();
            }
          };

          var savingClassificationPoll = null;

          scope.$on('$locationChangeStart', function () {
            scope.stopSavingClassificationPolling();
          });

          scope.startSavingClassificationPolling = function () {

            // if poll already started, do nothing
            if (savingClassificationPoll) {
              return;
            }

            console.log('Starting saving classification polling');

            savingClassificationPoll = $interval(function () {
              if ($routeParams.taskKey) {
                snowowlService.getClassificationForTask($routeParams.projectKey, $routeParams.taskKey, scope.classificationContainer.id).then(function (response) {

                  // update the status
                  scope.classificationContainer.status = response.status;

                  if (response.status === 'SAVED') {

                    notificationService.sendMessage('Classification saved', 5000);

                    // broadcast reloadTask event to capture new classificaiton
                    // status
                    $rootScope.$broadcast('reloadTask');

                    // refresh the viewed list
                    var conceptsToReload = scope.viewedConcepts.map(function (concept) {
                      return concept.conceptId;
                    });

                    // clear the viewed list
                    scope.viewedConcepts = [];

                    angular.forEach(conceptsToReload, function (conceptId) {
                      scope.viewConcept(conceptId);
                    });

                    // broadcast reloadConcepts event to refresh currently
                    // viewed concepts
                    $rootScope.$broadcast('reloadConcepts');

                    scope.stopSavingClassificationPolling();

                    // save the ui state based on response status
                  }
                  else if (response.status === 'STALE') {
                    notificationService.sendWarning('Report Stale, please re-classify and save.');

                    scope.stopSavingClassificationPolling();

                  }
                  else if (response.status === 'SAVE_FAILED') {
                    notificationService.sendError('Saving classification aborted');

                    scope.stopSavingClassificationPolling();

                  }
                });
              } else {
                snowowlService.getClassificationForProject($routeParams.projectKey, scope.classificationContainer.id).then(function (response) {
                  if (response.status === 'SAVED') {

                    notificationService.sendMessage('Classification saved', 5000);

                    scope.classificationContainer.status = response.status;

                    $timeout(function () {
                      $rootScope.$broadcast('reloadProject');
                    }, 1000);

                    // refresh the viewed list
                    var conceptsToReload = scope.viewedConcepts.map(function (concept) {
                      return concept.conceptId;
                    });

                    // clear the viewed list
                    scope.viewedConcepts = [];

                    angular.forEach(conceptsToReload, function (conceptId) {
                      scope.viewConcept(conceptId);
                    });

                    // broadcast reloadConcepts event to refresh currently
                    // viewed concepts
                    $rootScope.$broadcast('reloadConcepts');

                    scope.stopSavingClassificationPolling();

                  }

                });
              }
            }, 5000);
          };

          scope.stopSavingClassificationPolling = function () {
            if (savingClassificationPoll) {
              console.log('Stopping saving classification polling');
              $interval.cancel(savingClassificationPoll);
            }
          };

          /**
           * Saves the given status with the current timestamp
           * @param status
           */
          scope.saveClassificationUiState = function (status) {
            // cancel the poll
            if (savingClassificationPoll) {
              $interval.cancel(savingClassificationPoll);
            }

            // persist this classification id and current time in milliseconds
            scaService.saveUiStateForUser(
              'classification-' + scope.classificationContainer.id,
              {
                status: status,
                timestamp: (new Date()).getTime()
              });
          };

          /**
           * Shorthand function to get the classification ui state (if saved)
           * @returns {*}
           */
          scope.getClassificationUiState = function () {
            return scaService.getUiStateForUser('classification-' + scope.classificationContainer.id).then(function (response) {
              return response;
            });
          };

          /**
           * Function to download classification as a csv file
           */
          scope.downloadClassification = function () {

            // set limit to 1 million to ensure all results downloaded
            snowowlService.downloadClassification(scope.classificationContainer.id, scope.branch, 1000000).then(function (data) {
              var fileName = 'classifier_' + $routeParams.taskKey;
              scope.dlcDialog(data.data, fileName);
            });
          };

          /**
           * Function to check whether a classification has been fully
           * initialized
           * @returns true if all arrays initialized, false if not
           */
          scope.isClassificationLoaded = function () {
            return scope.relationshipChanges && scope.redundantStatedRelationships && scope.inferredNotPreviouslyStated && scope.equivalentConcepts;
          };

          scope.loadRelationshipChanges = function (limit) {
            scope.statusText = 'Loading...';
            scope.relationshipChanges = null;
            // get relationship changes
            snowowlService.getRelationshipChanges(scope.classificationContainer.id, scope.branch, limit).then(function (relationshipChanges) {

              scope.relationshipChanges = relationshipChanges ? relationshipChanges : [];

              // apply sourceName, typeName, and destinationName to allow for
              // ng-table sorting (ng-table cannot sort by item.property
              angular.forEach(scope.relationshipChanges.items, function (rel) {
                if (rel.source) {
                  rel.sourceName = rel.source.fsn;
                }
                if (rel.destination) {
                  rel.destinationName = rel.destination.fsn;
                }
                if (rel.type) {
                  rel.typeName = rel.type.fsn;
                }
              });

              // copy the redundant stated relationships into their own array
              scope.redundantStatedRelationships = [];
              if (scope.classificationContainer.redundantStatedRelationshipsFound) {
                angular.forEach(scope.relationshipChanges.items, function (item) {
                  if (item.changeNature === 'REDUNDANT') {
                    scope.redundantStatedRelationships.push(item);
                  }
                });
              }

              scope.setStatusText();
            }, function (error) {
              notificationService.sendError('Unexpected error: ' + error);
              scope.errorState = true;
            });
          };

          scope.role = null;
          scope.$watch('task', function() {
            accountService.getRoleForTask(scope.task).then(function(role) {
              scope.role = role;
            })
          })

          // process the classification object on any changes
          scope.$watch('classificationContainer', function () {

            if (!scope.classificationContainer || !scope.classificationContainer.id) {
              return;
            }

            // set the item arrays to null to trigger loading status detection
            scope.relationshipChanges = null;
            scope.redundantStatedRelationships = null;
            scope.inferredNotPreviouslyStated = null;
            scope.equivalentConcepts = null;

            // set flag for whether any results were found
            scope.resultsNotEmpty = scope.classificationContainer.equivalentConceptsFound ||
              scope.classificationContainer.inferredRelationshipChangesFound ||
              scope.classificationContainer.redundantStatedRelationshipsFound;


            // set the display status text
            scope.setStatusText();

            // if the status of the classification is saving, start polling
            if (scope.classificationContainer.status === 'SAVING_IN_PROGRESS') {
              scope.startSavingClassificationPolling();
            }

            // on initial load, limit relationship changes to 1000
            scope.loadRelationshipChanges(1000);

            // get inferred previously not stated relationships
            // TODO Not yet implemented, provide empty array
            scope.inferredNotPreviouslyStated = [];

            // get equivalent concepts

            if (scope.classificationContainer.equivalentConceptsFound) {
              scope.actionTab = 4;
              (function($) {
                     $('.classification').removeClass('active');
                     $('.equivalency').addClass('active');
                }(jQuery));
              snowowlService.getEquivalentConcepts(scope.classificationContainer.id, scope.branch).then(function (equivalentConcepts) {
                var equivalentConceptsArray = [];
                equivalentConcepts = equivalentConcepts ? equivalentConcepts : {};
                scope.equivalentConcepts = [];
                angular.forEach(equivalentConcepts, function (item) {
                  if (item.equivalentConcepts.length === 2) {
                    scope.equivalentConcepts.push(item.equivalentConcepts);
                  }
                  else {
                    var key = item.equivalentConcepts[0];
                    angular.forEach(item.equivalentConcepts, function (equivalence) {
                      if (equivalence !== key) {
                        var newEq = [];
                        newEq.push(key);
                        newEq.push(equivalence);
                        scope.equivalentConcepts.push(newEq);
                      }
                    });
                  }
                });
                console.log(scope.equivalentConcepts);
              }, function (error) {
                notificationService.sendError('Unexpected error: ' + error);
                scope.errorState = true;

              });
            } else {
              scope.equivalentConcepts = [];
            }

          }, true);

          scope.viewConceptInTaxonomy = function (concept) {
            $rootScope.$broadcast('viewTaxonomy', {
              concept: {
                conceptId: concept.conceptId,
                fsn: concept.fsn
              }
            });
          };

          ////////////////////////////////////
          // Validation Functions
          ////////////////////////////////////

          // start latest validation
          scope.startValidation = function () {


            // check if this is a task or project
            if ($routeParams.taskKey) {
              notificationService.sendMessage('Submitting task for validation...');
              scaService.startValidationForTask($routeParams.projectKey, $routeParams.taskKey).then(function (validation) {
                notificationService.sendMessage('Task successfully submitted for validation');
              }, function () {
                notificationService.sendMessage('Error submitting task for validation');
              });
            } else {
              notificationService.sendMessage('Submitting project for validation...');

              scaService.startValidationForProject($routeParams.projectKey).then(function (response) {
                notificationService.sendMessage('Project successfully submitted for validation');
              }, function () {
                notificationService.sendMessage('Error submitting project for validation');
              });
            }
          };

          /////////////////////////////////////////
          // Review functions
          /////////////////////////////////////////
          scope.submitForReview = function () {

            // ensure this is not called for projects
            if (!$routeParams.taskKey) {
              return;
            }

            // get task to check if it's eligible for update
            scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
              if (!response) {
                notificationService.sendError('Error submitting task for review:  Could not retrieve task', 0);
              } else {
                if (response.status === 'New') {
                  notificationService.sendWarning('No work exists for this task, cannot submit for review', 10000);
                }
                else if (response.status === 'In Review' || response.status === 'Review Completed') {
                  notificationService.sendWarning('Task is already in review', 10000);
                } else if (response.status === 'Promoted') {
                  notificationService.sendWarning('Cannot submit promoted task for review', 10000);
                } else {

                  scaService.updateTask(
                    $routeParams.projectKey, $routeParams.taskKey,
                    {
                      'status': 'IN_REVIEW'
                    }).then(function (response) {
                    scaService.saveUiStateForReviewTask($routeParams.projectKey, $routeParams.taskKey, 'reviewed-list', []);
                    // whether success or fail, disable button
                  });
                }
              }
            });

          };

          /////////////////////////////////////////
          // Concept Edit/Display Functions
          /////////////////////////////////////////
          scope.$on('viewClassificationConcept', function (event, data) {
            var conceptId = data.conceptId;
          });

        }

      };
    }]);
