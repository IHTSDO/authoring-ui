'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('validation', ['$rootScope', '$filter', '$q', 'ngTableParams', '$routeParams', 'configService', 'validationService', 'scaService', 'snowowlService', 'notificationService', 'accountService', '$timeout', '$modal','metadataService',
    function ($rootScope, $filter, $q, NgTableParams, $routeParams, configService, validationService, scaService, snowowlService, notificationService, accountService, $timeout, $modal, metadataService) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // validation container structure:
          // { report: [validation report], ...}
          validationContainer: '=',

          // flag for whether or not to allow editing controls
          editable: '&',

          // branch this report is good for
          branch: '=',

          // the task (optional)
          task: '=?'
        },
        templateUrl: 'shared/validation/validation.html',

        link: function (scope, element, attrs, linkCtrl) {


          scope.editable = attrs.editable === 'true';
          scope.showTitle = attrs.showTitle === 'true';
          scope.displayStatus = '';
          scope.taskKey = $routeParams.taskKey;
          scope.isCollapsed = false;
          scope.autosaveEnabled = $routeParams.taskKey ? true : false;

          // highlighting map
          scope.styles = {};


          scope.getSNF = function (id) {
            var deferred = $q.defer();
            snowowlService.getConceptSNF(id, scope.branch).then(function (response) {
              deferred.resolve(response);
            });
            return deferred.promise;
          };

          scope.conceptUpdateFunction = function (project, task, concept) {
            var deferred = $q.defer();
            snowowlService.updateConcept(project, task, concept).then(function (response) {
              deferred.resolve(response);
            });
            return deferred.promise;
          };
          // instantiate validation container if not supplied
          if (!scope.validationContainer) {
            scope.validationContainer = {executionStatus: '', report: ''};
          }

          // the rules to exclude


          // local variables for ng-table population
          scope.assertionsFailed = [];
          scope.failures = [];

          // Allow broadcasting of new validation results
          // e.g. from server-side notification of work complete
          scope.$on('setValidation', function (event, data) {
            scope.validationContainer = data.validation;

          });

          // function to get formatted summary text
          scope.getStatusText = function () {

            // check required elements
            if (!scope.validationContainer) {
              return;
            }
            if (!scope.validationContainer.executionStatus || scope.validationContainer.executionStatus === '') {
              return;
            }

            // get the human-readable execution status
            var status = scope.validationContainer.executionStatus.toLowerCase().replace(/\w\S*/g, function (txt) {
              return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });

            if (scope.validationContainer.report && scope.validationContainer.report.rvfValidationResult) {

              // get the end time if specified
              if (scope.validationContainer.report.rvfValidationResult.endTime) {
                var endTime = scope.validationContainer.report.rvfValidationResult.endTime;
                return status + ' ' + covertToLocalTime(endTime);
              }

              if (scope.validationContainer.report.rvfValidationResult.startTime) {
                var startTime = scope.validationContainer.report.rvfValidationResult.startTime;
                return status + ', started ' + covertToLocalTime(startTime);
              }
            }

            return status;
          };
          
          function covertToLocalTime(dateTime) {
            if (!dateTime) {
              return;
            }
           
            var localTime = new Date(dateTime + ' UTC');
            return $filter('date')(localTime, 'medium');
          }

          scope.isProject = function(){
              if(scope.taskKey){
                  return false
              }
              else{return true}
          }

          // declare table parameters
          scope.topTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {failureCount: 'desc'},
              orderBy: 'failureCount'
            },
            {
              filterDelay: 50,
              total: '-',
              getData: function ($defer, params) {

                if (!scope.assertionsFailed || scope.assertionsFailed.length === 0) {
                  params.total(0); // resolving empty array does not actually set total to 0
                  $defer.resolve([]);
                } else {

                  // cycle over each failed assertion to get count / display status
                  angular.forEach(scope.assertionsFailed, function (assertionFailed) {
                    if(assertionFailed.failureCount !== -1){
                        var filteredInstances = assertionFailed.firstNInstances.filter(function (instance) {

                          // if viewing task report and instance is not user modified, return false
                          if (!scope.viewFullReport && !instance.isBranchModification) {
                            return false;
                          }
                          // if validation failure is excluded, return false
                          if (validationService.isValidationFailureExcluded(assertionFailed.assertionUuid, instance.conceptId, instance.detail)) {
                            return false;
                          }

                          // otherwise return true
                          return true;
                        });
                        assertionFailed.filteredCount = filteredInstances.length;
                        assertionFailed.total = assertionFailed.failureCount;
                    }
                  });


                  // filter by user modification
                  var orderedData = scope.assertionsFailed.filter(function (assertionFailed) {
                    return assertionFailed.filteredCount > 0;
                  });

                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );

          // sets view to top and clears viewed concept list
          scope.setViewTop = function () {
            scope.viewTop = true;
            scope.topTableParams.reload();
            scope.viewedConcepts = [];
          };

          // on load, set top vie
          scope.setViewTop();


          var conceptIds = [];

          function getConceptIdForFailure(failure) {
            var deferred = $q.defer();
            switch (String(failure.conceptId).substring(String(failure.conceptId).length - 2, String(failure.conceptId).length - 1)) {
              // concept: simply return
              case '0':
                conceptIds.push(failure.conceptId);
                deferred.resolve();
                break;
              // description: get description by id, replace with concept id
              case '1':
                snowowlService.getDescriptionProperties(failure.conceptId, scope.branch).then(function (desc) {
                  failure.conceptId = desc.conceptId;
                  conceptIds.push(desc.conceptId);
                  deferred.resolve();
                }, function (error) {
                  deferred.reject();
                });
                break;
              // relationship: get relationship by id, replace with source concept id
              case '2':
                snowowlService.getRelationshipProperties(failure.conceptId, scope.branch).then(function (rel) {
                  failure.relationshipId = rel.sourceId;
                  conceptIds.push(rel.sourceId);
                  deferred.resolve();
                }, function (error) {
                  deferred.reject();
                });
                break;
              default:
                console.error('Failure has unrecognized id type: ' + failure.conceptId);
                deferred.reject();
            }
            return deferred.promise;
          }

          //
          // Concept FSN and Description Term display names
          //

          scope.idNameMap = {};

          function getConceptNames(failures) {
            var deferred = $q.defer();
            var promises = [];

            angular.forEach(failures, function (failure) {
              promises.push(getConceptIdForFailure(failure));
            });

            angular.forEach(scope.failures, function (failure) {
              // switch on concept, relationship, or description
              promises.push(getConceptIdForFailure(failure));
            });

             $q.all(promises).then(function () {

               // skip if no concept ids
              if (conceptIds.length > 0) {

                // bulk call for concept ids
                snowowlService.bulkGetConcept(conceptIds, scope.branch).then(function (concepts) {
                  angular.forEach(concepts.items, function (concept) {
                    scope.idNameMap[concept.id] = concept.fsn.term;
                  });
                  angular.forEach(scope.failures, function (failure) {
                    failure.conceptFsn = scope.idNameMap[failure.conceptId];
                  });

                  deferred.resolve();
                });
              } else {
                deferred.resolve();
              }
            });

            return deferred.promise;
          }

          //
          // Prepare description and relationship id references and names from the error messages
          //
          function prepareReferencedComponents() {
            var deferred = $q.defer();
            var failuresPrepared = 0;

            angular.forEach(scope.failures, function (failure) {

              // try to detect referenced descriptions/relationships
              var matchInfo = failure.detail.match(/[id[=:]+]*(\d+[12]\d)[^\d]/i);

              if (matchInfo) {

                // different behavior depending on description vs. relationship
                switch (matchInfo[1].substring(matchInfo[1].length - 2, matchInfo[1].length - 1)) {
                  case '1':
                    snowowlService.getDescriptionProperties(matchInfo[1], scope.branch).then(function (description) {

                      // apply the reference
                      failure.referencedComponentId = matchInfo[1];
                      failure.referencedComponentType = 'Description';
                      failure.detail = failure.detail.replace(matchInfo[0], '\"' + description.term + '\"');

                      if (++failuresPrepared === scope.failures.length) {
                        deferred.resolve();
                      }
                    });
                    break;
                  case '2':
                    failure.referencedComponentId = matchInfo[1];
                    failure.referencedComponentType = 'Relationship';
                    if (++failuresPrepared === scope.failures.length) {
                      deferred.resolve();
                    }
                    break;
                  default:
                    console.error('improperly matched descriptions/relationships');
                    deferred.reject('Improper matching for descriptions/relationships');
                }
              } else {
                if (++failuresPrepared === scope.failures.length) {
                  deferred.resolve();
                }
              }


              deferred.resolve();
              /*
               if (componentIds) {

               }


               // try to match a description
               var descId = failure.detail.match(/description: id=(\d+)/i);

               // if description found and display name not already retrieved and added
               if (descId && descId[1]) {
               console.debug('  description found: ', descId[1]);
               failure.referencedComponentId = descId[1];
               snowowlService.getDescriptionProperties(descId[1], scope.branch).then(function (description) {
               failure.detail = failure.detail.replace(/description: id=(\d+)/i, 'Description: ' + description.term);

               if (++failuresPrepared === scope.failures.length) {
               deferred.resolve();
               }
               });

               }

               // otherwise, try to match relationship
               else {
               var relId = failure.detail.match(/relationship: id=(\d+)/i);
               if (relId && relId[1]) {
               console.debug('  relationship found: ', relId[1]);
               failure.referencedComponentId = relId[1];
               if (++failuresPrepared === scope.failures.length) {
               deferred.resolve();
               }
               }

               // otherwise, do nothing
               else if (++failuresPrepared === scope.failures.length) {
               deferred.resolve();
               }
               }*/

            });
            return deferred.promise;
          }

          // called by failureTableParams.getData(), retrieves names if needed
          function getNamesForFailures() {
            return $q.all([prepareReferencedComponents(), getConceptNames()]);
          }

          // declare table parameters
          scope.failureTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {userModified: 'desc'},
              orderBy: 'userModified'
            },
            {
              total: '-',
              getData: function ($defer, params) {
                // clear the loading variable on reload
                scope.failuresLoading = false;

                if (!scope.failures || scope.failures.length === 0) {
                  params.total(0); // resolving empty array does not actually set total to 0
                  $defer.resolve([]);
                } else {

                  // filter by user modification
                  var orderedData = scope.failures.filter(function (failure) {
                    return scope.viewFullReport || failure.isBranchModification;
                  });

                  // filter by user exclusion
                  orderedData = orderedData.filter(function (failure) {
                    return !validationService.isValidationFailureExcluded(scope.assertionFailureViewed.assertionUuid, failure.conceptId, failure.detailUnmodified);
                  });

                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;
                  orderedData = orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count());
                  $defer.resolve(orderedData);
                }
              }
            }
          );


          // declare table parameters
          scope.exclusionsTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {},
              orderBy: 'timestamp'
            },
            {
              total: '-',
              getData: function ($defer, params) {

                var orderedData = [];
                var branchRoot = metadataService.isExtensionSet() ? metadataService.getBranchRoot().split('/').pop() : 'MAIN'; 
                validationService.getValidationFailureExclusions().then(function (exclusions) {

                  for (var key in exclusions) {
                    angular.forEach(exclusions[key], function (failure) {
                      if (!failure.hasOwnProperty('branchRoot') || failure['branchRoot'] === branchRoot) {
                        orderedData.push(failure);
                      }                      
                    });
                  }

                  //     console.debug('ordered data', orderedData);
                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;
                  orderedData = orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count());
                  $defer.resolve(orderedData);
                });

              }
            }
          );

          scope.viewExclusions = false;

          scope.toggleViewExclusions = function () {
            scope.viewExclusions = !scope.viewExclusions;
            if (scope.viewExclusions) {
              scope.exclusionsTableParams.reload();
            }
          };

          scope.reloadTables = function () {
            if (scope.viewTop) {
              scope.topTableParams.reload();
            } else {
              scope.failureTableParams.reload();
            }
            if (scope.viewExclusions) {
              scope.exclusionsTableParams.reload();
            }
          };

          //
          // Assertion failure and individual failure computation
          //

          // controls for viewing full vs. task report
          scope.viewFullReport = false;
          scope.toggleFullReport = function () {
            scope.viewFullReport = !scope.viewFullReport;
            scope.reloadTables();
          };

          scope.userModifiedConceptIds = [];

          function initFailures() {

            var deferred = $q.defer();

            // extract the failed assertions
            scope.assertionsFailed = scope.validationContainer.report.rvfValidationResult.TestResult.assertionsFailed;

            // filter out technical errors
            configService.getExcludedValidationRuleIds().then(function (response) {
              scope.assertionsExcluded = response;

              scope.assertionsFailed = scope.assertionsFailed.filter(function (assertion) {
                return scope.assertionsExcluded && Array.isArray(scope.assertionsExcluded) ? scope.assertionsExcluded.indexOf(assertion.assertionUuid) === -1 : true;
              });

              // set the viewable flags for all returned failure instances
              angular.forEach(scope.assertionsFailed, function (assertion) {
                if(assertion.failureCount !== -1){
                    assertion.isBranchModification = false;
                    assertion.hasUserExclusions = false;
                    angular.forEach(assertion.firstNInstances, function (instance) {

                      // store the unmodified text to preserve original data
                      instance.detailUnmodified = instance.detail;

                      // detect if instance references user modified concepts
                      if (scope.userModifiedConceptIds.indexOf(String(instance.conceptId)) !== -1) {
                        instance.isBranchModification = true;
                        assertion.isBranchModification = true;
                      }

                      if (validationService.isValidationFailureExcluded(assertion.assertionUuid, instance.conceptId, instance.detail)) {
                        instance.isUserExclusion = true;
                        instance.hasUserExclusions = true;
                      }
                    });
                }
              });

              // load the tables
              scope.reloadTables();
              deferred.resolve();
            }, function() {
              scope.reloadTables();
              notificationService.sendWarning('Error retrieving validation configuration; whitelist and excluded rules are shown');
            });

            return deferred.promise;


          }

          // watch for changes in the validation in order to populate tables
          var failuresInitialized = false;

          scope.$watch('validationContainer', function (newVal, oldVal) {

            scope.initializing = true;

            if (!scope.validationContainer || !scope.validationContainer.report) {
              return;
            }


            // only initialize once -- watch statement fires multiple times otherwise
            if (failuresInitialized) {
              return;
            }
            failuresInitialized = true;

            // retrieve the whitelistable rule ids -- used to display Add to Whitelist button
            configService.getWhiteListEligibleRuleIds().then(function (response) {
              scope.whitelistEligibleRuleIds = response;
            });

            notificationService.sendMessage('Retrieving traceability information ...');
            snowowlService.getTraceabilityForBranch(scope.branch).then(function (traceability) {


              // if traceability found, extract the user modified concept ids
              if (traceability) {
                angular.forEach(traceability.content, function (change) {
                  // if content change and concept change, push the id
                  if (change.activityType === 'CONTENT_CHANGE') {
                    angular.forEach(change.conceptChanges, function (conceptChange) {
                      if (scope.userModifiedConceptIds.indexOf(conceptChange.conceptId) === -1) {
                        scope.userModifiedConceptIds.push(String(conceptChange.conceptId));
                      }
                    });
                  }
                });

              } else {
                notificationService.sendWarning('Could not retrieve traceability for task');
              }

              // initialize the failures
              notificationService.sendMessage('Initializing validation failures...');
              initFailures().then(function () {
                notificationService.sendMessage('Initialization complete', 3000);
                scope.initializing = false;
              });


            }, function (error) {
                notificationService.sendMessage('Initializing validation failures...');
              initFailures().then(function () {
                notificationService.sendMessage('Initialization complete', 3000);
                scope.initializing = false;
              });
        });


          }, true); // make sure to check object inequality, not reference!


          scope.viewFailures = function (assertionFailure) {

            scope.assertionFailureViewed = assertionFailure;
            scope.viewTop = false;
            scope.failuresLoading = true;

            var objArray = [];

            // check if this failure is whitelistable
            scope.whitelistEnabled = scope.whitelistEligibleRuleIds &&
              scope.whitelistEligibleRuleIds.indexOf(assertionFailure.assertionUuid) !== -1;

            angular.forEach(assertionFailure.firstNInstances, function (instance) {


              // NOTE: store the unmodified failure text
              var obj = {
                conceptId: instance.conceptId,
                detail: instance.detail,
                detailUnmodified : instance.detailUnmodified,
                selected: false,
                isBranchModification: instance.isBranchModification,
                isUserExclusion: instance.isUserExclusion
              };

              objArray.push(obj);
            });


            scope.failures = objArray;
            getNamesForFailures().then(function () {
              scope.failureTableParams.reload();
            }, function () {
              scope.failureTableParams.reload();
            });
          }
          ;

          scope.selectAll = function (selectAllActive) {
            angular.forEach(scope.failures, function (failure) {
              failure.selected = selectAllActive;
            });
          };

          /**
           * Remove concepts from viewed list on stopEditing events from
           * conceptEdit
           */
          scope.$on('stopEditing', function (event, data) {
            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === data.concept.conceptId) {
                scope.viewedConcepts.splice(i, 1);
                return;
              }
            }
          });

//
// User-modified validation exclusion list
//

          scope.removeUserExclusionFromTable = function (failure, skipCommitFlag) {
            validationService.removeValidationFailureExclusion(failure.assertionUuid, failure.conceptId, failure.failureText).then(function () {
              scope.reloadTables();
            });
          };

// exclude a single failure, with optional commit
          scope.excludeFailure = function (failure, skipCommitFlag) {

            accountService.getAccount().then(function (accountDetails) {
              // get the user name
              var userName = !accountDetails || !accountDetails.login ? 'Unknown User' : accountDetails.login;
              var branchRoot = metadataService.isExtensionSet() ? metadataService.getBranchRoot().split('/').pop() : 'MAIN';

              // set the local flag to false to ensure immediate removal
              failure.isUserExclusion = true;

              // add the exclusion and update tables
              // NOTE: Must use the unmodified detail, not the referenced component modified detail
              validationService.addValidationFailureExclusion(scope.assertionFailureViewed.assertionUuid,
                scope.assertionFailureViewed.assertionText,
                failure.conceptId,
                failure.conceptFsn,
                failure.detailUnmodified,
                userName,
                branchRoot).then(function () {

                scope.reloadTables();
              });
            });

          };

          scope.isExcluded = function (failure) {
            validationService.isValidationFailureExcluded(scope.assertionFailureViewed.assertionUuid, failure.conceptId, failure.detailUnmodified);
          };

          /**
           * Function to add a concept by id to the list
           * Used by single editConcept or multiple editSelectedConcept methods
           * @param conceptId
           * @returns {*|promise}
           */
          function editConceptHelper(failure) {
            var deferred = $q.defer();

            // clear existing styles
            scope.styles[failure.conceptId] = {};

            // if failure has a component id, set new styling
            if (failure.referencedComponentId) {
              var componentStyling =
              scope.styles[failure.conceptId][failure.referencedComponentId] = {
                message: failure.detail, style: 'redhl'
              }
            }

            snowowlService.getFullConcept(failure.conceptId, scope.branch).then(function (response) {
              if (!scope.viewedConcepts || !Array.isArray(scope.viewedConcepts)) {
                scope.viewedConcepts = [];
              }
              scope.viewedConcepts.push(response);
              deferred.resolve(response);
            }, function (error) {
              deferred.reject(); // no error passing, for count purposes only
            });

            return deferred.promise;
          }

          scope.editConcept = function (failure) {
            if (!scope.task) {
              return;
            }
            
            // Already loaded check
            if(scope.viewedConcepts 
              && scope.viewedConcepts.length > 0
              && scope.viewedConcepts.filter(function(item) { return item.conceptId === failure.conceptId; }).length === 1) {
              notificationService.sendWarning('Concept already loaded');              
              return;
            }

            notificationService.sendMessage('Loading concept...');
            editConceptHelper(failure).then(function (response) {
              notificationService.sendMessage('Concept loaded', 5000);

              $timeout(function () {
                $rootScope.$broadcast('viewTaxonomy', {
                  concept: {
                    conceptId: failure.conceptId,
                    fsn: response.fsn
                  }
                });
              }, 500);
            }, function (error) {
              notificationService.sendError('Error loading concept', 5000);
            });

          };

          scope.editSelectedConcepts = function () {
            var nConcepts = 0;
            notificationService.sendMessage('Loading concepts...');

            // construct array of concept ids for previously loaded concepts
            var existingIds = scope.viewedConcepts.map(function (viewed) {
              return viewed.conceptId;
            });

            var failuresToLoad = scope.failures.filter(function (failure) {
              return failure.selected && existingIds.indexOf(failure.conceptId.toString()) === -1;
            });

            var conceptsLoaded = 0;
            angular.forEach(failuresToLoad, function (failure) {

              // add the concept
              editConceptHelper(failure).then(function () {

                if (++conceptsLoaded === failuresToLoad.length) {
                  notificationService.sendMessage('Concepts loaded.', 5000);
                }
              }, function (error) {
                notificationService.sendError('Error loading at least one concept');
              });

            });
          };

          scope.excludeFailures = function () {
            var failures = scope.failureTableParams.data;
            var failuresToAddWhiteList = failures.filter(function (failure) {
              return failure.selected;
            });

            if(failuresToAddWhiteList.length === 0) {
              return;
            }

            accountService.getAccount().then(function (accountDetails) {
              // get the user name
              var userName = !accountDetails || !accountDetails.login ? 'Unknown User' : accountDetails.login;
              var branchRoot = metadataService.isExtensionSet() ? metadataService.getBranchRoot().split('/').pop() : 'MAIN';

              // set the local flag to false to ensure immediate removal
              angular.forEach(failuresToAddWhiteList, function (failure) {                
                failure.isUserExclusion = true;
              });              

              // add the exclusion and update tables
              // NOTE: Must use the unmodified detail, not the referenced component modified detail
              validationService.addValidationFailuresExclusion(scope.assertionFailureViewed.assertionUuid,
                scope.assertionFailureViewed.assertionText,
                failuresToAddWhiteList,
                userName,
                branchRoot).then(function () {

                scope.reloadTables();
              });
            });

          };

          scope.openCreateTaskModal = function (task, editList, savedList) {

            var modalInstance = $modal.open({
              templateUrl: 'shared/task/task.html',
              controller: 'taskCtrl',
              resolve: {
                task: function () {
                  return task;
                },
                canDelete: function () {
                  return false;
                }
              }
            });

            modalInstance.result.then(function (task) {

              notificationService.sendMessage('Task ' + task.key + ' created', -1, '#/tasks/task/' + task.projectKey + '/' + task.key + '/edit');

              scaService.saveUiStateForTask(task.projectKey, task.key, 'edit-panel', editList).then(function (response) {
                scaService.saveUiStateForTask(task.projectKey, task.key, 'saved-list', {items: savedList}); // TODO Seriously rethink the saved list
              });

            }, function () {
            });
          };

          scope.createTaskFromFailures = function () {

            notificationService.sendMessage('Constructing task from project validation...');

            // attempt to construct the edit list from user selections
            var editList = [];
            angular.forEach(scope.failures, function (failure) {
              if (editList.selected && editList.indexOf(failure.errorMessage.conceptId) === -1) {
                editList.push(failure.errorMessage.conceptId);
              }
            });

            // if edit list is empty, use all failure instances
            angular.forEach(scope.failures, function (failure) {
              if (editList.indexOf(failure.errorMessage.conceptId === -1)) {
                editList.push(failure.errorMessage.conceptId);
              }
            });

            // temporary restriction on number of items to prevent giant server
            // load
            if (editList.length > 10) {
              notificationService.sendWarning('No more than 20 scope.failures can be put into a task at this time');
              return;
            }

            notificationService.sendMessage('Adding concept information to new task ...');

            // retrieve the requested concept information and construct the
            // saved list
            var idConceptMap = {};
            var savedList = [];
            angular.forEach(editList, function (conceptId) {
              snowowlService.getFullConcept(conceptId, scope.branch).then(function (response) {

                // add concept to map for properties retrieval (for task detail)
                idConceptMap[conceptId] = response.fsn;

                // construct the saved list item
                var savedListItem = {
                  active: response.active,
                  concept: {
                    conceptId: conceptId,
                    fsn: response.fsn,
                    active: response.active,
                    definitionStatus: response.definitionStatus,
                    moduleId: response.moduleId
                  }
                };

                savedList.push(savedListItem);
                notificationService.sendMessage('Adding concept information to new task... (' + (savedList.length) + '/' + editList.length + ')');

                if (savedList.length === editList.length) {

                  notificationService.sendMessage('Creating task...');

                  // construct the saved list and task details
                  var taskDetails = 'Error Type: ' + scope.assertionFailureViewed + '\n\n';
                  angular.forEach(scope.failures, function (failure) {
                    // if this concept was encountered, add it to details
                    if (idConceptMap[failure.errorMessage.conceptId]) {
                      taskDetails += 'Concept: ' + idConceptMap[failure.errorMessage.conceptId] + ', Error: ' + failure.errorMessage.detail + '\n';
                    }
                  });

                  var task = {
                    projectKey: $routeParams.projectKey,
                    summary: 'Validation errors found at project level',
                    description: taskDetails
                  };

                  scope.openCreateTaskModal(task, editList, savedList);
                }
              });
            });

          };
        }

      }
        ;

    }])
;
