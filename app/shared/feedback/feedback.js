'use strict';

angular.module('singleConceptAuthoringApp')
  .directive('typeaheadFocusCustom', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attr, ctrl) {
            element.bind('click', function () {
              if (ctrl.$viewValue) {
                ctrl.$setViewValue(ctrl.$viewValue);
              }
              else {
                ctrl.$setViewValue(' ');
              }
            });
            element.bind('focus', function () {
              if (ctrl.$viewValue) {
                ctrl.$setViewValue(ctrl.$viewValue);
              }
              else {
                ctrl.$setViewValue(' ');
              }
            });
            element.bind('keyup', function (event) {
              if (event.keyCode === 13) return;

              if (ctrl.$viewValue) {
                ctrl.$setViewValue(ctrl.$viewValue);
              }
              else {
                ctrl.$setViewValue(' ');
              }
            });
        }
    };
  })
  .directive('feedback', ['$rootScope', 'ngTableParams', '$q', '$modal', '$routeParams', '$filter', '$timeout', '$compile', 'terminologyServerService', 'scaService', 'modalService', 'accountService', 'notificationService', '$location', '$interval','metadataService','layoutHandler','hotkeys','componentHighlightUtil','reviewService', 'localStorageService', 'aagService', 'rnmService',
    function ($rootScope, NgTableParams, $q, $modal, $routeParams, $filter, $timeout, $compile, terminologyServerService, scaService, modalService, accountService, notificationService, $location, $interval, metadataService, layoutHandler, hotkeys, componentHighlightUtil, reviewService, localStorageService, aagService, rnmService) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // feedback container structure:
          // { conceptsToReview: [...], conceptsReviewed: [...] }

          // flag for whether or not to allow editing controls
          editable: '&',

          // branch this report is good for
          branch: '=',

          // view mode, for example : no sidebar
          view: '=',

          // flag to enable/disable the Context Based Editing for concept
          enableContextBasedEditing: '=?'
        },
        templateUrl: 'shared/feedback/feedback.html',

        link: function (scope, element, attrs, linkCtrl) {

          ////////////////////////////////////////////////////
          // NOTE
          //
          // Both ng-table and dragndrop.js reserve the keyword
          // $data.  For this particular situation, where dragndrop
          // functionality is wrapped inside an ng-table, the
          // ng-table data is handled by explicit arrays.  This breaks
          // the binding between the displayed data and the original
          // feedbackContainer elements, necessitating some rather
          // cumbersome functions, which are marked accordingly
          ////////////////////////////////////////////////////
          scope.feedbackContainer = {};
          $rootScope.$broadcast('viewReview', {});
          scope.editable = attrs.editable === 'true';
          scope.showTitle = attrs.showTitle === 'true';
          scope.displayStatus = '';
          scope.limitConceptsLoading = 10;
          scope.projectKey = $routeParams.projectKey;
          scope.taskKey = $routeParams.taskKey;
          scope.inactiveDescriptions = {};
          scope.loadingTermForClassifiedConcepts = false;
          scope.loadingTermForConcepts = false;
          scope.releaseNotesDisabled = true;
          scope.languages = [];
          scope.lineItems = [];
          var users = [];
          var userCount = 0;
          var sendingConceptToReview = false;

          // utility function pass-thrus
          scope.isExtensionSet = metadataService.isExtensionSet;
          scope.useInternationalLanguageRefsets = metadataService.useInternationalLanguageRefsets

          function getUsers(offset) {
            scaService.getUsers(offset).then(function (response) {
              if (response.users.items.length > 0) {
                userCount += response.users.items.length;
                angular.forEach(response.users.items, function (item) {
                  if (item.key !== $rootScope.accountDetails.login) {
                    var user = {};
                    user.avatarUrl = item.avatarUrls['16x16'];
                    user.displayName = item.displayName;
                    user.email = item.emailAddress;
                    user.username = item.name;
                    users.push(user);
                  }
                });
              }

              if (response.users.size > userCount) {
                getUsers(offset + 50);
              }
            },
            function (error) {
              console.error(error);
            });
          }

          function initLanguagesDropdown () {
            let foundInCache = false;
            let result = metadataService.getDropdownLanguages();
            scope.languages = result.languages;

            if (localStorageService.get($rootScope.accountDetails.login + '-review-selected-language-id')) {
              const cachedLanguageId = localStorageService.get($rootScope.accountDetails.login + '-review-selected-language-id');
              let language = scope.languages.filter(function(item) {
                return item.id === cachedLanguageId;
              })[0];
              if (language) {
                foundInCache = true;
                scope.selectedLanguage = language;
              }
            }
            if (!foundInCache) {
              scope.selectedLanguage = result.selectedLanguage;
            }
            scope.onLanguageChange(scope.selectedLanguage);
          }

          function getBranchLineItems() {
            rnmService.getBranchLineItems(scope.branch).then(function (lineItems) {
                if (lineItems) {
                  angular.forEach(lineItems, function (item) {
                      scope.lineItems.push(item);
                  });
                }
                scope.lineItemTableParams.reload();
            });
          }

          function getReviewedList() {
            var deferred = $q.defer();
            scaService.getUiStateForReviewTask($routeParams.projectKey, $routeParams.taskKey, 'reviewed-list').then(function (response) {
              if (response) {
                if (Array.isArray(response)) {
                  deferred.resolve({'conceptIds': response, 'approvalDate': null});
                } else {
                  deferred.resolve(response);
                }
              } else {
                deferred.resolve({'conceptIds': [], 'approvalDate': null});
              }
            });
            return deferred.promise;
          }

          function saveReviewedList(list) {
            var deferred = $q.defer();
            var data = {
              'conceptIds': list,
              'approvalDate': new Date()
            };
            scaService.saveUiStateForReviewTask($routeParams.projectKey, $routeParams.taskKey, 'reviewed-list', data).then(function (response) {
              deferred.resolve(response);
            });
            return deferred.promise;
          }

          scope.onLanguageChange = function(language) {
            scope.selectedLanguage = language;
            localStorageService.set($rootScope.accountDetails.login + '-review-selected-language-id', language.id);
            const acceptLanguageValue = getAcceptLanguageValue(language);
            const useFSN = (language && (language.id === '900000000000509007' ||language.id === '900000000000509007-fsn')) || !scope.isExtensionSet() || scope.useInternationalLanguageRefsets();

            feedbackContainerDone = false;
            scope.loadingTermForConcepts = true;
            reviewService.getLatestReview(scope.branch, $routeParams.projectKey, $routeParams.taskKey, acceptLanguageValue, useFSN).then(function (review) {
              scope.feedbackContainer.review = review;
              scope.conceptsToReviewTableParams.reload();
              scope.conceptsReviewedTableParams.reload();
              scope.conceptsClassifiedTableParams.reload();
              feedbackContainerDone = true;
              scope.loadingTermForConcepts = false;
            }, function (error) {
               scope.feedbackContainer.review = {errorMsg: error};
            });
          };

          function getAcceptLanguageValue(language) {
            let acceptLanguageValue = "";
            if (scope.isExtensionSet()
              && !scope.useInternationalLanguageRefsets()
              && language.id !== '900000000000509007-fsn'
              && language.id !== '900000000000509007-pt') {
              if (language) {
                acceptLanguageValue = metadataService.getExtensionAcceptLanguageValueByDialectId(language.id);
              } else {
                acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(metadataService.getCurrentModuleId());
              }
            } else {
              acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(metadataService.getInternationalModuleId());
            }

            return acceptLanguageValue;
          }

          scope.authorInputOnFocus = function (event){
            console.log(event);
          };

          scope.viewTaxonomy = function() {
            $rootScope.$broadcast('swapToTaxonomy');
          };

          scope.viewSearch = function () {
            $rootScope.$broadcast('swapToSearch');
          };

          scope.viewSavedList = function () {
            $rootScope.$broadcast('swapToSavedList');
          };

          scope.viewBatch = function () {
            $rootScope.$broadcast('swapToBatch');
          };

          scope.viewTaskDetails = function () {
            $rootScope.$broadcast('swapToTaskDetails');
          };

          // the editor scope variables
          scope.htmlVariable = '';
          scope.requestFollowup = false;

          // select all booleans for each table
          scope.booleanObj = {};
          scope.booleanObj.checkedToReview = false;
          scope.booleanObj.checkedReviewed = false;

          hotkeys.bindTo(scope)
            .add({
              combo: 'alt+down',
              description: 'Next Concept',
              callback: function() {
                scope.selectNextConcept();
              }
            }).add({
              combo: 'alt+t',
              description: 'Create a New Task',
              callback: function() {$scope.openCreateTaskModal();}
            });

          // hotkeys.bindTo(scope)
          //   .add({
          //     combo: 'alt+a',
          //     description: 'Approve Concept',
          //     callback: function() {
          //       scope.approveAllConcepts();
          //     }
          //   });

          // get the user information to determine role
          // values: AUTHOR, REVIEWER

          scope.openCreateTaskModal = function () {
                var modalInstance = $modal.open({
                  templateUrl: 'shared/task/task.html',
                  controller: 'taskCtrl',
                  resolve: {
                    task: function () {
                      return null;
                    },
                    canDelete: function () {
                      return false;
                    }
                  }
                });

                modalInstance.result.then(function (response) {
                  loadTasks();
                }, function () {
                });
            };
          scope.role = null;
          scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (task) {
            if (task) {
              scope.task = task;
              scope.reviewComplete = task.status !== 'In Review';
              accountService.getRoleForTask(task).then(function (role) {
                scope.role = role;
              }, function() {
                scope.role = 'UNKNOWN';
                notificationService.sendError('Could not determine role for task ' + $routeParams.taskKey);
              });
            }
          });

          //Function to poll for the review status to check if the author cancels the review and subsequently lock down the review functions for the reviewer.

          var poll = null;

          scope.startTaskPoll = function () {
            poll = $interval(function () {
              var oldStatus = scope.task.status;
              if ($routeParams.projectKey && $routeParams.taskKey){
                scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (task) {
                  if (task) {
                    scope.task = task;
                    scope.reviewComplete = task.status !== 'In Review';
                    accountService.getRoleForTask(task).then(function (role) {
                      scope.role = role;
                    }, function() {
                      scope.role = 'UNKNOWN';
                    });
                    if (oldStatus === 'In Review' && task.status === 'In Progress') {
                      scope.reloadConceptsToReview('');
                      scope.reloadConceptsReviewed('');
                      scope.reloadConceptsClassified('');
                    }
                  }
                });
              }
              else {
                if (poll) {
                  $interval.cancel(poll);
                }
              }
            }, 10000);
          };

          scope.startTaskPoll();
          // declare viewed arrays for ng-table
          scope.conceptsToReviewViewed = [];
          scope.conceptsReviewedViewed = [];
          scope.allChecked = false;

          // declare table parameters
          scope.conceptsToReviewTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {term: 'asc'},
              orderBy: 'term'
            },
            {
              filterDelay: 50,
              total: scope.feedbackContainer && scope.feedbackContainer.review && scope.feedbackContainer.review.conceptsToReview ?
                scope.feedbackContainer.review.conceptsToReview.length : 0,

              getData: function ($defer, params) {

                var myData = [];

                if (!scope.feedbackContainer || !scope.feedbackContainer.review || !scope.feedbackContainer.review.conceptsToReview || scope.feedbackContainer.review.conceptsToReview.length === 0) {
                  scope.conceptsToReviewViewed = [];
                } else {

                  var searchStr = scope.conceptsToReviewSearchStr;

                  if (searchStr) {
                    myData = scope.feedbackContainer.review.conceptsToReview.filter(function (item) {
                      return item.descriptions && item.descriptions.filter(function(d) {return d.active && d.term.toLowerCase().indexOf(searchStr.toLowerCase()) > -1}).length != 0;
                    });
                  } else {
                    myData = scope.feedbackContainer.review.conceptsToReview;
                  }

                  // filter based on presence of feedback if requested
                  if (scope.viewConceptsMode !== 'All concepts') {
                    var newData = [];
                    angular.forEach(myData, function (item) {
                      if (scope.viewConceptsMode === 'Concepts with feedback' && item.messages && item.messages.length > 0) {
                        newData.push(item);
                      } else if (scope.viewConceptsMode === 'Concepts without feedback' && (!item.messages || item.messages.length === 0)) {
                        newData.push(item);
                      }
                    });
                    myData = newData;
                  }

                  // set viewed flag based on current viewed list
                  angular.forEach(myData, function (item) {
                    item.viewed = false;
                    angular.forEach(scope.viewedConcepts, function (viewedConcept) {
                      if (viewedConcept.conceptId === item.conceptId) {
                        item.viewed = true;
                      }
                    });
                  });

                  // hard set the new total
                  myData = params.sorting() ? $filter('orderBy')(myData, params.orderBy()) : myData;

                  params.total(myData.length);
                  // extract the paged results
                  scope.conceptsToReviewViewed = (myData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                  if (scope.conceptsToReviewViewed.length === 0 && myData.length !== 0) {
                    scope.conceptsToReviewTableParams.page(params.page() - 1);
                    scope.conceptsToReviewViewed = (myData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                  }
                  $defer.resolve(scope.conceptsToReviewViewed);
                }
              }
            }
          );

          /**
           * May need to change depending on responsive needs
           * @param name the unique column name
           * @returns (*) an array of col-(size)-(width) class names
           */
          scope.getLayoutWidths = layoutHandler.getLayoutWidths;

          scope.conceptsClassifiedTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {term: 'asc'},
              orderBy: 'term'
            },
            {
              filterDelay: 50,
              total: scope.feedbackContainer && scope.feedbackContainer.review && scope.feedbackContainer.review.conceptsClassified ?
                scope.feedbackContainer.review.conceptsClassified.length : 0,

              getData: function ($defer, params) {

                var myData = [];

                if (!scope.feedbackContainer || !scope.feedbackContainer.review || !scope.feedbackContainer.review.conceptsClassified || scope.feedbackContainer.review.conceptsClassified.length === 0) {
                  scope.conceptsClassified = [];
                } else {

                  var searchStr = scope.conceptsClassifiedSearchStr;

                  if (searchStr) {
                    myData = scope.feedbackContainer.review.conceptsClassified.filter(function (item) {
                      return item.term && item.term.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                    });
                  } else {
                    myData = scope.feedbackContainer.review.conceptsClassified;
                  }

                  // filter based on presence of feedback if requested
                  if (scope.viewConceptsMode !== 'All concepts') {
                    var newData = [];
                    angular.forEach(myData, function (item) {
                      if (scope.viewConceptsMode === 'Concepts with feedback' && item.messages && item.messages.length > 0) {
                        newData.push(item);
                      } else if (scope.viewConceptsMode === 'Concepts without feedback' && (!item.messages || item.messages.length === 0)) {
                        newData.push(item);
                      }
                    });
                    myData = newData;
                  }
                  // hard set the new total

                  myData = params.sorting() ? $filter('orderBy')(myData, params.orderBy()) : myData;

                  params.total(myData.length);
                  // extract the paged results
                  scope.conceptsClassified = (myData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                  if (scope.conceptsClassified.length === 0 && myData.length !== 0) {
                    scope.conceptsClassifiedTableParams.page(params.page() - 1);
                    scope.conceptsClassified = (myData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                  }
                  $defer.resolve(scope.conceptsClassified);
                }
              }
            }
          );

          // declare table parameters
          scope.conceptsReviewedTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {term: 'asc'},
              orderBy: 'term'
            },
            {
              filterDelay: 50,
              total: scope.feedbackContainer && scope.feedbackContainer.review && scope.feedbackContainer.review.conceptsReviewed ?
                scope.feedbackContainer.review.conceptsReviewed.length : 0,
              getData: function ($defer, params) {

                if (!scope.feedbackContainer || !scope.feedbackContainer.review || !scope.feedbackContainer.review.conceptsReviewed || scope.feedbackContainer.review.conceptsReviewed.length === 0) {
                  scope.conceptsReviewedViewed = [];
                } else {

                  var searchStr = scope.conceptsReviewedSearchStr;
                  var myData;

                  if (searchStr) {
                    myData = scope.feedbackContainer.review.conceptsReviewed.filter(function (item) {
                      return item.descriptions && item.descriptions.filter(function(d) {return d.active && d.term.toLowerCase().indexOf(searchStr.toLowerCase()) > -1}).length != 0;
                    });
                  } else {
                    myData = scope.feedbackContainer.review.conceptsReviewed;
                  }

                  // filter based on presence of feedback if requested
                  if (scope.viewConceptsMode !== 'All concepts') {
                    var newData = [];
                    angular.forEach(myData, function (item) {
                      if (scope.viewConceptsMode === 'Concepts with feedback' && item.messages && item.messages.length > 0) {
                        newData.push(item);
                      } else if (scope.viewConceptsMode === 'Concepts without feedback' && (!item.messages || item.messages.length === 0)) {
                        newData.push(item);
                      }
                    });
                    myData = newData;
                  }

                  // hard set the new total
                  params.total(myData.length);

                  // sort -- note this doubletriggers $watch statement....
                  // but we want the actual order to be preserved in the
                  // original  array for reordering purposes
                  myData = params.sorting() ? $filter('orderBy')(myData, params.orderBy()) : myData;

                  // TODO Enable filtering

                  // extract the paged results -- SEE NOTE AT START
                  scope.conceptsReviewedViewed = (myData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                  if (scope.conceptsReviewedViewed.length === 0 && myData.length !== 0) {
                    scope.conceptsReviewedTableParams.page(params.page() - 1);
                    scope.conceptsReviewedViewed = (myData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                  }
                  $defer.resolve(scope.conceptsReviewedViewed);
                }
              }
            }
          );

          // declare table parameters
          scope.lineItemTableParams = new NgTableParams({
              page: 1,
              count: 10
            },
            {
              filterDelay: 50,
              total: scope.lineItems.length,
              getData: function ($defer, params) {
                params.total(scope.lineItems.length);
                $defer.resolve(scope.lineItems);
              }
            }
          );

          scope.openLineItemModal = function (id) {
            let item = {};
            angular.forEach(scope.lineItems, function (lineItem) {
              if (lineItem.id === id) {
                item = lineItem;
              }
            });
            $modal.open({
              templateUrl: 'shared/releaseNotes/lineItem.html',
              controller: 'lineItemCtrl',
              resolve: {
                  branch: function() {
                    return scope.branch;
                  },
                  lineItem: function() {
                    return item;
                  },
                  lineItems: function() {
                    return [];
                  },
                  globalLineItems: function() {
                    return [];
                  },
                  mode: function() {
                    return 'READ_ONLY';
                  },
                  isProject: function() {
                    return false;
                  }
                }
            });
          };

          // functions to reload both tables
          scope.reloadConceptsToReview = function (searchStr) {
            scope.conceptsToReviewSearchStr = searchStr;
            scope.conceptsToReviewTableParams.reload();
          };
          scope.reloadConceptsReviewed = function (searchStr) {
            scope.conceptsReviewedSearchStr = searchStr;
            scope.conceptsReviewedTableParams.reload();
          };
          scope.reloadConceptsClassified = function (searchStr) {
            scope.conceptsClassifiedSearchStr = searchStr;
            scope.conceptsClassifiedTableParams.reload();
          };

          // cancel review
          scope.cancelReview = function () {
            getReviewedList().then(function (response) {
              var taskUpdateObj = {
                'status': 'IN_PROGRESS',
                'reviewers': []
              };
              if(response.conceptIds.length > 0) {
                  modalService.confirm('There are ' + response.conceptIds.length + ' approved concepts in the review. Cancelling will reset all concepts to unapproved and will require all concepts to be (re-)approved in a new review. To keep the approved work, please ask the reviewer to unclaim the review. Are you sure you want to cancel this review?', 'font-size: 14px;line-height: 1.7;').then(function () {

                    scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, taskUpdateObj).then(function (response) {
                      notificationService.sendMessage('Review Cancelled', 2000);
                      $rootScope.$broadcast('reloadTask');
                      scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (task) {
                        if (task) {
                          scope.task = task;
                          scope.reviewComplete = task.status !== 'In Review';
                          accountService.getRoleForTask(task).then(function (role) {
                            scope.role = role;
                          });

                          if (scope.role === 'UNDEFINED') {
                            notificationService.sendError('Could not determine role for task ' + $routeParams.taskKey);
                          }
                        }
                      });
                    });
                    }, function () {
                      // do nothing
                });
              } else {
                  scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, taskUpdateObj).then(function (response) {
                    notificationService.sendMessage('Review Cancelled', 2000);
                    $rootScope.$broadcast('reloadTask');
                    scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (task) {
                      if (task) {
                        scope.task = task;
                        scope.reviewComplete = task.status !== 'In Review';
                        accountService.getRoleForTask(task).then(function (role) {
                          scope.role = role;
                        });

                        if (scope.role === 'UNDEFINED') {
                          notificationService.sendError('Could not determine role for task ' + $routeParams.taskKey);
                        }
                      }
                    });
                  });
                }
            });
          };

          // controls to allow to view only concepts with feedeback
          scope.viewConceptsMode = 'All concepts';
          scope.setViewConcepts = function (value) {
            scope.viewConceptsMode = value;
            scope.conceptsToReviewTableParams.reload();
            scope.conceptsReviewedTableParams.reload();
            scope.conceptsClassifiedTableParams.reload();
          };

          scope.download = function() {
            if (!scope.feedbackContainer || !scope.feedbackContainer.review || !scope.feedbackContainer.review.conceptsToReview || scope.feedbackContainer.review.conceptsToReview.length === 0) {
              notificationService.sendMessage('No concepts to download.', 10000);
            } else {
              var clonedConcepts = angular.copy(scope.feedbackContainer.review.conceptsToReview);
              var data = [];
              data.push({
                'conceptId': 'Concept ID',
                'conceptFsn': 'Term'
              });
              clonedConcepts.forEach(function(item) {
                data.push({
                  'conceptId': item.conceptId,
                  'conceptFsn': scope.isDeletedConcept(item) ? 'Deleted concept' : item.term
                });
              })
              scope.dlcDialog(convertToCSV(data), 'Concepts_' + (new Date()).getTime());
            }
          };

          scope.dlcDialog = (function (data, fileName) {
            var a = document.createElement('a');
            document.body.appendChild(a);
            return function (data, fileName) {
              var
                blob = new Blob([data], {type: 'text/tab-separated-values'}),
                url = window.URL.createObjectURL(blob);
              a.href = url;
              a.download = fileName;
              a.click();
              window.URL.revokeObjectURL(url);
            };
          }());

          function convertToCSV(objArray) {
            var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
            var str = '';
            for (var i = 0; i < array.length; i++) {
                var line = '';
                for (var index in array[i]) {
                    if (line != '') line += '\t';
                    line += array[i][index];
                }
                str += line + '\r\n';
            }
            return str;
          }

          // watch for notification of updated concepts from conceptEdit
          // directive
          scope.$on('conceptEdit.conceptChanged', function (event, data) {

            // ignore if concepts arrays are not declared (not initialized)
            if (!scope.feedbackContainer || !scope.feedbackContainer.review.conceptsReviewed || !scope.feedbackContainer.review.conceptsToReview) {
              return;
            }

            // cycle over resolved list
            for (var i = 0; i < scope.feedbackContainer.review.conceptsReviewed.length; i++) {

              // declaration for convenience
              var concept = scope.feedbackContainer.review.conceptsReviewed[i];

              // if this concept is present, move it from Resolved to To Resolve
              if (concept.conceptId === data.conceptId) {
                scope.feedbackContainer.review.conceptsReviewed.splice(i);
                scope.feedbackContainer.review.conceptsToReview.push(concept);
                getReviewedList().then(function (response) {
                  var list = response.conceptIds;
                  if (list.length > 0) {
                    if (list.indexOf(data.conceptI) > -1) {
                      list.splice(list.indexOf(data.conceptId), 1);
                    }
                    saveReviewedList(list).then(function (response) {});
                  }
                });
              }
            }
          });

          scope.moveItemToReviewed = function (item) {
            item.selected = false;
            scope.feedbackContainer.review.conceptsReviewed.push(item);
            var elementPos = scope.feedbackContainer.review.conceptsToReview.map(function (x) {
              return x.conceptId;
            }).indexOf(item.conceptId);
            scope.feedbackContainer.review.conceptsToReview.splice(elementPos, 1);
          };

          // move item from ToReview to Reviewed
          scope.addToReviewed = function (items) {
            if (!Array.isArray(items)) {
              var cloned = angular.copy(items);
              items = [];
              items.push(cloned);
            }
            if (items.length === 0) return;

            if (items.length > 1) {
              notificationService.sendMessage('Multiple concepts marked as approved.', 5000, null);
            } else {
              notificationService.sendMessage('Concept: ' + (items[0].term ? items[0].term : items[0].conceptId) + ' marked as approved.', 5000, null);
            }

            angular.forEach(items, function (item) {
              scope.moveItemToReviewed(item);
            });
            getReviewedList().then(function (response) {
              var list = response.conceptIds;
              if (list.length > 0) {
                angular.forEach(items, function (item) {
                  if (list.indexOf(item.conceptId) < 0) {
                    list.push(item.conceptId);
                  }
                });
                saveReviewedList(list).then(function (response) {});
              } else {
                var conceptIds = [];
                angular.forEach(items, function (item) {
                  conceptIds.push(item.conceptId);
                });
                saveReviewedList(conceptIds).then(function (response) {});
              }
            });

            scope.conceptsToReviewTableParams.reload();
            scope.conceptsReviewedTableParams.reload();
            scope.conceptsClassifiedTableParams.reload();
          };

          scope.conceptExistsInToReviewList = function (concept) {
            for (var i = 0; i < scope.feedbackContainer.review.conceptsToReview.length; i++) {
              var reviewConcept = scope.feedbackContainer.review.conceptsToReview[i];
              if (concept.conceptId === reviewConcept.conceptId) {
                return true;
              }
            }
            return false;
          };

          scope.setDisableLoadingProjectTaxonomy = function(disable) {
            scope.disableLoadingProjectTaxonomy = disable;
          };

          scope.conceptExistsInInferredList = function (concept) {
            if (!scope.disableLoadingProjectTaxonomy) {
              for (var i = 0; i < scope.feedbackContainer.review.conceptsClassified.length; i++) {
                var reviewConcept = scope.feedbackContainer.review.conceptsClassified[i];
                if (concept.conceptId === reviewConcept.conceptId) {
                  return true;
                }
              }
            }

            return false;
          };

          scope.$on('approveAndLoadNext', function (event, concept) {
            approveAndLoadNext(concept);
          });

          scope.$on('closeAndLoadNext', function (event, concept) {
            closeAndLoadNext(concept);
          });

          scope.$on('selectNextConcept', function (event, data) {
            var index = null;
            var conceptId = null;
            angular.forEach(scope.viewedConcepts, function(concept){
                if(concept.conceptId === data.id){
                    index = scope.viewedConcepts.indexOf(concept);
                }
            });
            if(index != null){
                if(scope.viewedConcepts[index + 1]){
                  conceptId = scope.viewedConcepts[index + 1].conceptId;
                }
                else{
                  conceptId = scope.viewedConcepts[0].conceptId;
                }
            }
            $rootScope.$broadcast('conceptFocusedFromKey', {id : conceptId});
          });

          scope.$on('selectPreviousConcept', function (event, data) {
            var index = null;
            var conceptId = null;
            angular.forEach(scope.viewedConcepts, function(concept){
                if(concept.conceptId === data.id){
                  index = scope.viewedConcepts.indexOf(concept);
                }
            });
            if(index != null){
                if(scope.viewedConcepts[index -1]){
                  conceptId = scope.viewedConcepts[index - 1].conceptId;
                }
                else{
                  conceptId = scope.viewedConcepts[scope.viewedConcepts.length -1].conceptId;
                }
            }
            $rootScope.$broadcast('conceptFocusedFromKey', {id : conceptId});
          });

           // Close all concepts listenerS
          scope.$on('closeAllOpenningConcepts', function () {
            closeAllConcepts();
          });

          scope.$on('closeAllConceptsFromReview', function () {
            closeAllConcepts();
          });

          scope.$on('editConcept', function (event, data) {
            if (data.noSwitchView) {
              notificationService.sendMessage('Loading concept ' + (data.fsn ? data.fsn : data.conceptId));
              addToEditHelper(data.conceptId).then(function (response) {
                notificationService.sendMessage('Concept loaded', 5000);
              });
            }
          });

          function closeAllConcepts () {
            scope.viewedConcepts = [];
            feebackProjectTaxonomyViewList = [];
            // mark as unviewed in ToReview list
            angular.forEach(scope.conceptsToReviewViewed, function (item) {
              item.viewed = false;
            });

            // mark as unviewed in Reviewed list
            angular.forEach(scope.conceptsReviewedViewed, function (item) {
              item.viewed = false;
            });

            angular.forEach(scope.conceptsClassified, function (item) {
              item.viewed = false;
            });
          }

          function closeAndLoadNext(concept) {
            let conceptInToReviewFound = false;
            let conceptInReviewedFound = false;
            let conceptInClassifiedFound = false;
            let elementPos = 0;
            for (let i = 0; i < scope.conceptsToReviewViewed.length; i++) {
              if (scope.conceptsToReviewViewed[i].conceptId === concept.conceptId) {
                elementPos = i;
                conceptInToReviewFound = true;
                break;
              }
            }
            if (!conceptInToReviewFound) {
              for (let i = 0; i < scope.conceptsReviewedViewed.length; i++) {
                if (scope.conceptsReviewedViewed[i].conceptId === concept.conceptId) {
                  elementPos = i;
                  conceptInReviewedFound = true;
                  break;
                }
              }
            }
            if (!conceptInToReviewFound && !conceptInReviewedFound && scope.conceptsClassified) {
              for (let i = 0; i < scope.conceptsClassified.length; i++) {
                if (scope.conceptsClassified[i].conceptId === concept.conceptId) {
                  elementPos = i;
                  conceptInClassifiedFound = true;
                  break;
                }
              }
            }

            if (conceptInToReviewFound || conceptInReviewedFound || conceptInClassifiedFound) {
              let conceptArr = conceptInToReviewFound ? scope.feedbackContainer.review.conceptsToReview :
                                                        (conceptInReviewedFound ? scope.feedbackContainer.review.conceptsReviewed :
                                                                                  scope.feedbackContainer.review.conceptsClassified);
              for (let i = 0; i < conceptArr.length; i++) {
                let reviewConcept = conceptArr[i];
                if (concept.conceptId === reviewConcept.conceptId) {
                  reviewConcept.viewed = false
                  // remove from viewed concepts list
                  for (let i = 0; i < scope.viewedConcepts.length; i++) {
                    if (scope.viewedConcepts[i].conceptId === concept.conceptId) {
                      scope.viewedConcepts.splice(i, 1);
                      break;
                    }
                  }
                  break;
                }
              }
            }

            // load next concept
            if (conceptInToReviewFound || conceptInReviewedFound || conceptInClassifiedFound) {
              let activeTableParam = conceptInToReviewFound ? scope.conceptsToReviewTableParams : (conceptInReviewedFound ? scope.conceptsReviewedTableParams : scope.conceptsClassifiedTableParams);
              let totalPage = Math.ceil(activeTableParam.total()/activeTableParam.count());
              let currentPage = activeTableParam.page();
              let itemPage = activeTableParam.$params.count;
              if (elementPos === (itemPage - 1) && currentPage < totalPage) {
                elementPos = -1;
                activeTableParam.page(currentPage + 1);
                activeTableParam.reload();
              }

              let conceptArr = conceptInToReviewFound ? scope.conceptsToReviewViewed : (conceptInReviewedFound ? scope.conceptsReviewedViewed : scope.conceptsClassified);
              let nextConcept = conceptArr[elementPos + 1];
              let found = false;
              angular.forEach(scope.viewedConcepts, function (viewConcept) {
                  if (nextConcept.conceptId === viewConcept.conceptId) {
                    found = true;
                  }
              });
              if (!found && !scope.isDeletedConcept(nextConcept)) {
                scope.selectConcept(nextConcept, conceptInToReviewFound ? []: (conceptInReviewedFound ? ['addToEdit'] : ['addToEdit','viewConceptInTaxonomy']));
              }
            }
          }

          function approveAndLoadNext(concept) {
            var elementPos = 0;
            for (var i = 0; i < scope.conceptsToReviewViewed.length; i++) {
              if (scope.conceptsToReviewViewed[i].conceptId === concept.conceptId) {
                elementPos = i;
              }
            }

            for (var i = 0; i < scope.feedbackContainer.review.conceptsToReview.length; i++) {
              var reviewConcept = scope.feedbackContainer.review.conceptsToReview[i];
              if (concept.conceptId === reviewConcept.conceptId) {

                // move to reviewed list
                reviewConcept.viewed = false
                scope.addToReviewed(reviewConcept);

                // remove from viewed concepts list
                for (var i = 0; i < scope.viewedConcepts.length; i++) {
                  if (scope.viewedConcepts[i].conceptId === concept.conceptId) {
                    scope.viewedConcepts.splice(i, 1);
                    break;
                  }
                }

                break;
              }
            }

            // load next concept
            if (scope.viewedConcepts.length === 0) {
              loadNextConcept(elementPos);
            } else {
              var found = false;
              angular.forEach(scope.viewedConcepts, function (viewConcept) {
                angular.forEach(scope.conceptsToReviewViewed, function (conceptToReviewViewed) {
                  if (viewConcept.conceptId === conceptToReviewViewed.conceptId) {
                    found = true;
                  }
                });
              });
              if(!found) {
                loadNextConcept(elementPos);
              }
            }
          };

          function loadNextConcept(elementPos) {
            if (elementPos < scope.conceptsToReviewViewed.length) {
              var nextConcept = scope.conceptsToReviewViewed[elementPos];
              if (!scope.isDeletedConcept(nextConcept)) {
                scope.selectConcept(nextConcept);
              }
            }
          }

          scope.deletedConceptIds = [];
          scope.isDeletedConcept = function(concept) {
            var deleted = !concept.term;
            if (deleted && !scope.deletedConceptIds.includes(concept.conceptId)) {
              scope.deletedConceptIds.push(concept.conceptId);
              scope.styles[concept.conceptId] = {};
              scope.styles[concept.conceptId].conceptStyle = {'style' : 'redhl'};
              scope.styles[concept.conceptId].isDeleted = true;
            } else if (!deleted && scope.deletedConceptIds.includes(concept.conceptId)) {
              scope.deletedConceptIds.splice(scope.deletedConceptIds.indexOf(concept.conceptId), 1);
            }
            return deleted;
          };

          scope.isActiveDescriptionOnInactiveConcept = function(concept) {
            if (concept && !concept.active && concept.descriptions) {
              for (let i =0; i < concept.descriptions.length; i++) {
                  if (concept.descriptions[i].active && !concept.descriptions[i].effectiveTime) {
                    return true;
                  }
              }
            }
            return false;
          }

          scope.isUnreadFeedbackFoundFromInferredTab = function() {
            var flag = false;
            if(scope.feedbackContainer.review) {
              angular.forEach(scope.feedbackContainer.review.conceptsClassified, function(classifiedConcept) {
                if (classifiedConcept.hasOwnProperty('read') && classifiedConcept.read !== 'absent' && !classifiedConcept.read) {
                  flag = true;
                }
              });
            }
            return flag;
          }

          scope.checkDeletedConceptById = function (conceptId) {
            return scope.deletedConceptIds.includes(conceptId);
          }
          // move item from Reviewed to ToReview
          scope.returnToReview = function (items) {
            if (sendingConceptToReview) return;

            if (!Array.isArray(items)) {
              var cloned = angular.copy(items);
              items = [];
              items.push(cloned);
            }

            sendingConceptToReview = true;

            scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (task) {
              scope.task = task;
              if (scope.task.status === 'Review Completed') {
                scope.reviewComplete = false;
                scope.changeReviewStatus(scope.reviewComplete);
                scope.reviewComplete = false;
              }
              angular.forEach(items, function (item) {
                item.selected = false;
                scope.feedbackContainer.review.conceptsToReview.push(item);
                var elementPos = scope.feedbackContainer.review.conceptsReviewed.map(function (x) {
                  return x.conceptId;
                }).indexOf(item.conceptId);
                scope.feedbackContainer.review.conceptsReviewed.splice(elementPos, 1);
              });

              scope.conceptsReviewedTableParams.reload();
              scope.conceptsToReviewTableParams.reload();
              scope.conceptsClassifiedTableParams.reload();
              sendingConceptToReview = false;

              getReviewedList().then(function (response) {
                var list = response.conceptIds;
                if (list.length > 0) {
                  angular.forEach(items, function (item) {
                    if (list.indexOf(item.conceptId) > -1) {
                      list.splice(list.indexOf(item.conceptId), 1);
                    }
                  });
                  saveReviewedList(list).then(function (response) {});
                }
              });
            });
          };

          scope.selectAll = function (actionTab, isChecked) {
            if (actionTab === 1) {
              angular.forEach(scope.conceptsToReviewViewed, function (item) {
                item.selected = isChecked;
              });
            } else if (actionTab === 2) {
              angular.forEach(scope.conceptsReviewedViewed, function (item) {
                item.selected = isChecked;
              });
            } else if (actionTab === 3) {
              angular.forEach(scope.conceptsClassified, function (item) {
                item.selected = isChecked;
              });
            }
          };

          scope.viewedConcepts = [];
          // if not already in saved list

          /**
           * Determine if an item is in the saved list
           * @param id the SCTID of the concept checked
           * @returns {boolean} true: exists, false: does not exist
           */


          /**
           * On stop editing events, deselect viewed element (both lists)
           */
          scope.$on('stopEditing', function (event, data) {

            // remove from viewed concepts list
            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === data.concept.conceptId) {
                scope.viewedConcepts.splice(i, 1);
                break;
              }
            }

            // mark as unviewed in ToReview list (if present)
            angular.forEach(scope.conceptsToReviewViewed, function (item) {
              if (item.conceptId === data.concept.conceptId) {
                item.viewed = false;
              }
            });

            // mark as unviewed in Reviewed list (if present)
            angular.forEach(scope.feedbackContainer.review.conceptsReviewed, function (item) {
              if (item.conceptId === data.concept.conceptId) {
                item.viewed = false;
              }
            });
            angular.forEach(scope.conceptsClassified, function (item) {
              if (item.conceptId === data.concept.conceptId) {
                item.viewed = false;
              }
            });

            // Remove the concept id from Project Taxonomy View List
            removeConceptFromProjectTaxonomyViewList(data.concept.conceptId);
          });

          // the scope variable containing the map of concept -> [style map]
          scope.styles = {};

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

          function addToEditHelper(conceptId,sorting) {

            // used for status update of addMultipleToEdit
            var deferred = $q.defer();

            // check if concept already exists in list
            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === conceptId) {
                notificationService.sendWarning('Concept already shown');
                if (scope.role === 'REVIEWER') {
                  $rootScope.$broadcast('conceptFocusedFromKey', {id : conceptId});
                }
                return;
              }
            }

            // get the full concept for this branch (current version)
            terminologyServerService.getFullConcept(conceptId, scope.branch).then(function (response) {
              componentHighlightUtil.runComparison(conceptId, scope.branch, response).then(function(result){
                if(sorting) {
                  scope.viewedConcepts = $filter('orderBy')(scope.viewedConcepts, sorting === 'asc' ? '+fsn' : '-fsn');
                }

                // Re-bind shortcut
                $timeout(function () {
                  hotkeys.bindTo(scope)
                    .add({
                      combo: 'alt+q',
                      description: 'Close all concepts',
                      callback: function() {
                        closeAllConcepts();
                      }
                    });
                }, 1000);

                scope.styles[conceptId] = result.styles;
                scope.inactiveDescriptions[conceptId] = result.inactiveDescriptions;
                scope.viewedConcepts.push(result.concept);

                deferred.resolve(result.concept);
              });
            });
            return deferred.promise;
          }

          scope.getSNF = function (id) {
            var deferred = $q.defer();
            terminologyServerService.getConceptSNF(id, scope.branch).then(function (response) {
              deferred.resolve(response);
            });
            return deferred.promise;
          };

          // function to add a concept to viewed list from tables
          scope.addToEdit = function (item) {
            // if viewed, ignore
            if (!item.viewed) {
              notificationService.sendMessage('Loading concept ' + item.conceptId);
              item.viewed = true;
              scaService.markTaskFeedbackRead($routeParams.projectKey, $routeParams.taskKey, item.conceptId).then(function (response) {
                item.read = true;
                item.modifiedSinceReview = false;
              });

              addToEditHelper(item.conceptId).then(function (response) {
                if (scope.role === 'REVIEWER') {
                  // set focus on the selected concept
                  setTimeout(function waitForConceptRender() {
                    var elm = document.getElementById('conceptId-' + item.conceptId);
                    if (document.body.contains(elm)) {
                      $rootScope.$broadcast('conceptFocusedFromKey', {id : item.conceptId});
                    } else {
                      setTimeout(waitForConceptRender, 500);
                    }
                  }, 500);
                }

                notificationService.sendMessage('Concept loaded', 5000);
              });
            }
          };
          scope.viewConceptInTaxonomy = function (concept) {
            $rootScope.$broadcast('viewTaxonomy', {
              concept: {
                conceptId: concept.conceptId,
                fsn: concept.term
              }
            });
          };
          scope.clearFeedback = function() {
            scope.viewedFeedback = [];
            scope.subjectConcepts = [];
          };

          // additional function to add based on concept id alone
          scope.addToEditFromConceptId = function (conceptId) {

            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === conceptId) {
                return;
              }
            }

            notificationService.sendMessage('Loading concept...');
            addToEditHelper(conceptId).then(function (response) {
              notificationService.sendMessage('Concept loaded', 5000);

              // reload the table params to ensure viewed flag is set properly
              scope.conceptsToReviewTableParams.reload();
              scope.concetpsReviewedTableParams.reload();
            });
          };

          // add all selected objects to edit panel list
          // depending on current viewed tab
          scope.addMultipleToEdit = function (actionTab) {
            var conceptsToAdd = [];
            scope.batchFeedback = false;
            if (actionTab === 1) {
              angular.forEach(scope.conceptsToReviewViewed, function (item) {
                if (item.selected === true && !item.viewed) {
                  conceptsToAdd.push(item);
                }
              });
            } else if (actionTab === 2) {
              angular.forEach(scope.conceptsReviewedViewed, function (item) {
                if (item.selected === true && !item.viewed) {
                  conceptsToAdd.push(item);
                }
              });
            } else if (actionTab === 3) {
              scope.setDisableLoadingProjectTaxonomy(true);
              scope.clearFeedback();
              angular.forEach(scope.conceptsClassified, function (item) {
                if (item.selected === true && !item.viewed) {
                  conceptsToAdd.push(item);
                }
              });
            }
            if (conceptsToAdd.length === 0) {
              notificationService.sendWarning('No concepts selected', 5000);
              return
            }

            if(conceptsToAdd.length > scope.limitConceptsLoading) {
              var msg = '';
              msg = 'Your selection exceeds the number of concepts that can be loaded. Please change your selection to a maximum of ' + scope.limitConceptsLoading + ' concepts';

              notificationService.sendWarning(msg, 10000);
              return;
            }

            if (conceptsToAdd.length === 1) {
              notificationService.sendMessage('Loading concept ' + conceptsToAdd[0].term);
            }

            if (conceptsToAdd.length > 1) {
              notificationService.sendMessage('Loading '+ conceptsToAdd.length +' concepts');
            }

            conceptsToAdd = conceptsToAdd.filter(function(concept) {
                            for (var i = 0; i < scope.viewedConcepts.length; i++) {
                              if (scope.viewedConcepts[i].conceptId === concept.conceptId) {
                                return false;
                              }
                            }
                            return true;
                          });

            for (var i = 0; i < conceptsToAdd.length; i++) {
              if (!scope.isDeletedConcept(conceptsToAdd[i])) {
                conceptsToAdd[i].viewed = true;
                addToEditHelper(conceptsToAdd[i].conceptId).then(function (response) {
                  notificationService.sendMessage('Concept: ' + response.conceptId + ' loaded', 5000);
                });
              }
            }
          };

          // move all selected objects from one list to the other
          // depending on current viewed tab
          // NOTE:  Apply stopUiUpdate flag
          scope.moveMultipleToOtherList = function (actionTab) {
            if (actionTab === 1) {
              var itemList = [];
              angular.forEach(scope.conceptsToReviewViewed, function (item) {
                if (item.selected === true) {
                  itemList.push(item);
                }
              });
              scope.addToReviewed(itemList);
              if(scope.booleanObj.checkedToReview) {
                scope.booleanObj.checkedToReview = false;
              }
              angular.forEach(itemList, function (item) {
                scope.$broadcast('stopEditing', {'concept': item});
              });
            } else if (actionTab === 2) {
              var items = []
              angular.forEach(scope.conceptsReviewedViewed, function (item) {
                if (item.selected === true) {
                  items.push(item);
                }
              });
              if (items.length !== 0) {
                scope.returnToReview(items);
              }
            }
          };

          scope.approveAllConcepts = function() {
            var itemList = [];

            angular.forEach(scope.conceptsToReviewViewed, function (item) {
              item.viewed = false;
              itemList.push(item);
            });

            scope.addToReviewed(itemList);

            scope.viewedConcepts = [];
          };

          // function called when dropping concept
          // targetIndex: the point at which to insert the dropped concept
          // draggedConcept: {startIndex: N, concept: {...}}
          scope.dropConcept = function (droppedConcept, draggedConcept, actionTab) {

            if (droppedConcept === draggedConcept) {
              // do nothing if same target as source
            } else {

              // copy array (to avoid triggering watch statement below)
              // on drop, disable auto-sorting of table params  -- otherwise
              // drag/drop makes no sense, will only be auto-re-ordered
              var newConceptArray = [];
              switch (actionTab) {
                case 1:
                  newConceptArray = scope.feedbackContainer.review.conceptsToReview;
                  scope.conceptsToReviewTableParams.sorting('');
                  break;
                case 2:
                  newConceptArray = scope.feedbackContainer.review.conceptsReviewed;
                  scope.conceptsReviewedTableParams.sorting('');
                  break;
                default:
                  console.error('Invalid tab selected for grouping selected concepts');
                  return;
              }

              // find the index at which the target concept is located
              // NOTE: This cannot be passed in simply, due to filtering
              var droppedIndex = -1;
              var draggedIndex = -1;
              for (var i = 0; i < newConceptArray.length; i++) {

                // NOTE: Compare by id, as dragged/dropped concepts have
                // $hashkey which prevents true equality checking
                if (newConceptArray[i].conceptId === droppedConcept.conceptId) {
                  droppedIndex = i;
                }
                if (newConceptArray[i].conceptId === draggedConcept.conceptId) {
                  draggedIndex = i;
                }
              }

              // check that both indices were found
              if (droppedIndex === -1 || draggedIndex === -1) {
                console.error('Error determining indices for drag and drop');
                return;
              }

              // insert very slight timeout to allow dragndrop to check for
              // requested effects (deleting too fast causes undefined-access
              // errors)
              $timeout(function () {
                // remove the passed object
                newConceptArray.splice(draggedIndex, 1);

                // insert the dragged concept at the target index
                newConceptArray.splice(droppedIndex, 0, draggedConcept);

                // replace the appropriate array
                switch (actionTab) {
                  case 1:
                    scope.feedbackContainer.review.conceptsToReview = newConceptArray;
                    scope.conceptsToReviewTableParams.reload();
                    break;
                  case 2:
                    scope.feedbackContainer.review.conceptsReviewed = newConceptArray;
                    scope.conceptsReviewedTableParams.reload();
                    break;
                  default:
                    console.error('Invalid tab selected for grouping selected concepts');
                    return;
                }

              }, 25);

            }

          };

          // allow for grouped reordering
          scope.groupSelectedConcepts = function (actionTab) {

            // copy array (for convenience) and disable sorting
            // otherwise grouping will be overriden
            var newConceptArray = [];
            switch (actionTab) {
              case 1:
                newConceptArray = scope.feedbackContainer.review.conceptsToReview;
                scope.conceptsToReviewTableParams.sorting('');
                break;
              case 2:
                newConceptArray = scope.feedbackContainer.review.conceptsReviewed;
                scope.conceptsReviewedTableParams.sorting('');
                break;
              default:
                console.error('Invalid tab selected for grouping selected concepts');
                return;
            }

            // find the insertion point
            var selectedFound = false;
            var insertIndex = -1;
            for (var i = 0; i < newConceptArray.length; i++) {

              // if selected, mark entry into selected items
              if (newConceptArray[i].selected === true) {
                selectedFound = true;
              }

              // stop if not selected and a previously selected item was found
              // set the insert to index to after the last found selected
              else if (selectedFound === true) {
                insertIndex = i;
                break;
              }
            }

            // check that a selected item was found and is not the last item
            if (insertIndex === -1 || insertIndex === newConceptArray.length - 1) {
              return;
            }

            // cycle over all concepts to review in reverse
            var conceptsToInsert = [];
            for (var j = newConceptArray.length - 1; j > insertIndex; j--) {

              // if selected, save (FILO) and remove
              if (newConceptArray[j].selected) {
                conceptsToInsert.unshift(newConceptArray[j]);
                newConceptArray.splice(j, 1);
              }
            }

            // splice in the array at the insert point
            Array.prototype.splice.apply(newConceptArray, [insertIndex, 0].concat(conceptsToInsert));

            // assign to feedback container to trigger watch statement
            switch (actionTab) {
              case 1:
                scope.feedbackContainer.review.conceptsToReview = newConceptArray;
                scope.conceptsToReviewTableParams.reload();
                break;
              case 2:
                scope.feedbackContainer.review.conceptsReviewed = newConceptArray;
                scope.conceptsReviewedTableParams.reload();
                break;
              default:
                return;
            }
          };

          scope.toggleReviewStatus = function () {
            if (scope.task.status === 'In Review') {
              if (scope.conceptsToReviewViewed.length === 0) {
                scaService.markTaskReviewComplete($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
                  scope.task.status = response.data.status;
                  updateReviewChangesFlagForSACTask(true);
                  notificationService.sendMessage('Review marked completed for task ' + $routeParams.taskKey, 5000);
                }, function (error) {
                  notificationService.sendError('Error marking review complete: ' + error);
                });
              } else {
                notificationService.sendWarning('Cannot complete review: concepts still need review');
              }
            } else if (scope.task.status === 'Review Completed') {
              scaService.markTaskReviewInProgress($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
                scope.task.status = response.data.status;
                updateReviewChangesFlagForSACTask(false);
                notificationService.sendMessage('Task ' + $routeParams.taskKey + ' marked for review');
              }, function (error) {
                notificationService.sendMessage('Review returned to In Progress', 5000);
              });
            } else {
              notificationService.sendError('Cannot toggle review completion status: task has unexpected status ' + scope.task.status);
            }
          };

          function updateReviewChangesFlagForSACTask(completed) {
            aagService.getBranchSAC(scope.branch).then(function (sac) {
              if (sac && sac.criteriaItems) {
                angular.forEach(sac.criteriaItems, function (criteria) {
                  if (criteria.authoringLevel === "TASK" && criteria.id.includes('task-review-changes')) {
                    if (completed && !criteria.complete) {
                      aagService.acceptBranchSAC(scope.branch, criteria.id).then(function() {
                        console.log('Task review-changes has been updated to ' + completed);
                      });
                    } else if (!completed && criteria.complete){
                      aagService.unacceptBranchSAC(scope.branch, criteria.id).then(function() {
                        console.log('Task review-changes has been updated to ' + completed);
                      });
                    }

                    return;
                  }
                });
              }
            });
          }

          scope.getDateFromFeedback = function (feedback) {
            return new Date(feedback.creationDate);
          };

          function checkMessageUnreadStatus() {
            scaService.getConceptsWithUnreadFeedback($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
              angular.forEach(scope.feedbackContainer.review.conceptsToReview, function (concept) {
                if (response.indexOf(concept.conceptId) !== -1) {
                  concept.read = false;
                }
              });
              angular.forEach(scope.feedbackContainer.review.conceptsReviewed, function (concept) {
                if (response.indexOf(concept.conceptId) !== -1) {
                  concept.read = false;
                }
              });
            });
          }

          ////////////////////////////////////////////////////////////////////
          // Watch freedback container -- used as Initialization Block
          ////////////////////////////////////////////////////////////////////
          scope.$watch('feedbackContainer', function (oldValue, newValue) {

            if (!scope.feedbackContainer) {
              return;
            }

            // pre-processing on initial load (conceptsToReview and
            // conceptsReviewed do not yet exist)
            if (scope.feedbackContainer.review && !scope.feedbackContainer.errorMsg && !scope.feedbackContainer.review.conceptsToReview && !scope.feedbackContainer.review.conceptsReviewed) {

              // get the ui state
              var reviewedListIds = null;
              var approvalDate = null;
              getReviewedList().then(function (response) {
                reviewedListIds = response.conceptIds;
                approvalDate = response.approvalDate;
                // ensure response is in form of array for indexOf checking
                // later
                if (!reviewedListIds || !Array.isArray(reviewedListIds)) {
                  reviewedListIds = [];
                }

                // local arrays to avoid multiple watch triggers
                var conceptsToReview = [];
                var conceptsReviewed = [];


                // cycle over all concepts for pre-processing
                angular.forEach(scope.feedbackContainer.review.concepts, function (item) {
                  var lastViewed = new Date(item.viewDate);
                  var lastUpdated = new Date(item.lastUpdatedTime);

                  // set follow up request flag to false (overwritten below)
                  item.requestFollowup = false;
                  if (lastUpdated > lastViewed) {
                    item.modifiedSinceReview = true;
                  }
                  // if no feedback on this concept
                  if (!item.messages || item.messages.length === 0) {
                    item.read = 'absent'; // provide dummy value for sorting by
                                          // alphabetical value
                  }
                  // otherwise, process feedback
                  else {
                    var lastFeedback = new Date(item.messages[item.messages.length - 1].creationDate);
                    // cycle over all concepts to check for follow up request
                    // condition met if another user has left feedback with the
                    // flag later than the last feedback left by current user
                    if (lastFeedback > lastViewed) {
                      item.read = false;
                    }

                    else if (isNaN(lastViewed.getTime())) {
                      item.read = false;
                    }
                    else {
                      item.read = true;
                    }
                    for (var i = 0; i < item.messages.length; i++) {
                      // if own feedback, break
                      if (item.messages[i].fromUsername === $rootScope.accountDetails.login) {
                        break;
                      }
                      // if another's feedback, check for flag
                      if (item.messages[i].feedbackRequested) {
                        item.requestFollowup = true;
                      }
                    }
                  }

                  // check if id is in reviewed list
                  if (reviewedListIds.indexOf(item.conceptId) === -1) {
                    // apply check-all status
                    item.selected = scope.booleanObj.checkedToReview;
                    conceptsToReview.push(item);
                  }
                  // otherwise, on reviewed list
                  else {
                    item.selected = scope.booleanObj.checkedReviewed;
                    conceptsReviewed.push(item);
                  }
                });

                angular.forEach(scope.feedbackContainer.review.conceptsClassified, function (item) {
                  var lastViewed = new Date(item.viewDate);
                  var lastUpdated = new Date(item.lastUpdatedTime);

                  // set follow up request flag to false (overwritten below)
                  item.requestFollowup = false;
                  if (lastUpdated > lastViewed) {
                    item.modifiedSinceReview = true;
                  }
                  // if no feedback on this concept
                  if (!item.messages || item.messages.length === 0) {
                    item.read = 'absent'; // provide dummy value for sorting by
                                          // alphabetical value
                  }
                  // otherwise, process feedback
                  else {
                    var lastFeedback = new Date(item.messages[item.messages.length - 1].creationDate);
                    // cycle over all concepts to check for follow up request
                    // condition met if another user has left feedback with the
                    // flag later than the last feedback left by current user
                    if (lastFeedback > lastViewed) {
                      item.read = false;
                    }

                    else if (isNaN(lastViewed.getTime())) {
                      item.read = false;
                    }
                    else {
                      item.read = true;
                    }
                    for (var i = 0; i < item.messages.length; i++) {
                      // if own feedback, break
                      if (item.messages[i].fromUsername === $rootScope.accountDetails.login) {
                        break;
                      }
                      // if another's feedback, check for flag
                      if (item.messages[i].feedbackRequested) {
                        item.requestFollowup = true;
                      }
                    }
                  }
                });

                // Check read or unread status
                checkMessageUnreadStatus();

                // set the scope variables
                scope.feedbackContainer.review.conceptsToReview = conceptsToReview;
                scope.feedbackContainer.review.conceptsReviewed = conceptsReviewed;

                //Loops through all items in the reviewed list. If they have
                // been changed since  the review was created they are moved
                // back to 'To Review'
                if (scope.role === 'REVIEWER') {
                  var modifiedConceptsSinceReview = []
                  angular.forEach(scope.feedbackContainer.review.conceptsReviewed, function (item) {
                    if (approvalDate && item.lastUpdatedTime && new Date(item.lastUpdatedTime) > new Date(approvalDate)) {
                      modifiedConceptsSinceReview.push(item);
                    }
                  });
                  if (modifiedConceptsSinceReview.length !== 0) {
                    scope.returnToReview(modifiedConceptsSinceReview);
                  }
                }

                // on load, initialize tables -- all subsequent reloads are
                // manual
                scope.conceptsToReviewTableParams.reload();
                scope.conceptsReviewedTableParams.reload();
                scope.conceptsClassifiedTableParams.reload();

                // load currently viewed feedback (on reload)
                getViewedFeedback();
              });
            }
          }, true);

          scope.$watch(function() {
              return document.getElementById("feedback-model-concept-view") ? document.getElementById("feedback-model-concept-view").offsetHeight : 0
          }, function(newValue) {
              let feedbackChat = document.getElementById("feedback-chat");
              let feedbackWindow = document.getElementById("feedback-window");
              const windowHeight = jQuery(window).height();
              let availableHeight = windowHeight - newValue - 200;
              if (feedbackChat) {
                feedbackChat.style.maxHeight = (availableHeight > 175 ? availableHeight : 175) + 'px';
              }
              if (feedbackWindow) {
                feedbackWindow.style.height = (availableHeight > 166 ? availableHeight : 166) + 'px';
                jQuery(feedbackWindow).find('.ta-scroll-window').css('height', availableHeight > 166 ? (availableHeight - 70) + 'px' : '63%');
              }
          }, true);

          // check all request
          scope.checkAll = function () {
            scope.allChecked = !scope.allChecked;
            angular.forEach(scope.conceptsToReviewViewed, function (item) {
              item.selected = scope.allChecked;
            });
          };

          scope.subjectConcepts = [];
          scope.viewedFeedback = [];

          /*
           branch: {id: 1, project: "WRPAS", task: "WRPAS-22"}
           creationDate: "2015-08-20T18:43:25Z"
           fromUsername: "pgranvold"
           id: 8
           messageHtml: "test"
           subjectConceptIds: ["96885130000"]
           */
          function getViewedFeedback() {

            var viewedFeedback = [];

            // extract the concept ids for convenience
            var conceptIds = [];
            angular.forEach(scope.subjectConcepts, function (concept) {
              conceptIds.push(concept.conceptId);
            });

            // cycle over all currently displayed concepts
            angular.forEach(scope.conceptsToReviewViewed, function (concept) {

              // if concept is in selected list and has messages, add them
              if (conceptIds.indexOf(concept.conceptId) !== -1 && concept.messages && concept.messages.length > 0) {
                angular.forEach(concept.messages, function (message) {
                  // attach the concept name to the message for display when
                  // multiple concept feedbacks are viewed
                  message.conceptTerm = concept.term;
                  message.conceptId = concept.conceptId;
                  viewedFeedback.push(message);
                });

                // mark read if unread is indicated
                if (!concept.read) {
                  scaService.markTaskFeedbackRead($routeParams.projectKey, $routeParams.taskKey, concept.conceptId).then(function (response) {
                    concept.read = true;
                  });
                }
              }
            });
            angular.forEach(scope.conceptsReviewedViewed, function (concept) {

              // if concept is in selected list and has messages, add them
              if (conceptIds.indexOf(concept.conceptId) !== -1 && concept.messages && concept.messages.length > 0) {
                angular.forEach(concept.messages, function (message) {
                  // attach the concept name to the message for display when
                  // multiple concept feedbacks are viewed
                  message.conceptTerm = concept.term;
                  message.conceptId = concept.conceptId;
                  viewedFeedback.push(message);
                });

                // mark read if unread is indicated
                if (!concept.read) {
                  scaService.markTaskFeedbackRead($routeParams.projectKey, $routeParams.taskKey, concept.conceptId).then(function (response) {
                    concept.read = true;

                  });
                }
              }
            });

            angular.forEach(scope.conceptsClassified, function (concept) {

              // if concept is in selected list and has messages, add them
              if (conceptIds.indexOf(concept.conceptId) !== -1 && concept.messages && concept.messages.length > 0) {
                angular.forEach(concept.messages, function (message) {
                  // attach the concept name to the message for display when
                  // multiple concept feedbacks are viewed
                  message.conceptTerm = concept.term;
                  message.conceptId = concept.conceptId;
                  viewedFeedback.push(message);
                });

                // mark read if unread is indicated
                if (!concept.read) {
                  scaService.markTaskFeedbackRead($routeParams.projectKey, $routeParams.taskKey, concept.conceptId).then(function (response) {
                    concept.read = true;

                  });
                }
              }
            });

            // sort by creation date
            viewedFeedback.sort(function (a, b) {
              return a.creationDate < b.creationDate;
            });

            // set the scope variable for display
            scope.viewedFeedback = viewedFeedback;
          }

          scope.toTrustedHtml = function (htmlCode) {
            return $compile(htmlCode);
          };


          scope.selectConcept = function (concept, actions, disabledAction) {
            if(disabledAction) {
              return;
            }
            scope.viewFeedbackOnly = false;
            if(scope.isDeletedConcept(concept)) {
              // check if concept already exists in list
              for (var i = 0; i < scope.viewedConcepts.length; i++) {
                if (scope.viewedConcepts[i].conceptId === concept.conceptId) {
                  notificationService.sendWarning('Concept already shown');
                  if (scope.role === 'REVIEWER') {
                    $rootScope.$broadcast('conceptFocusedFromKey', {id : concept.conceptId});
                  }
                  return;
                }
              }

              notificationService.sendMessage('Loading concept ' + concept.conceptId);
              terminologyServerService.getFullConceptAtDate(concept.conceptId, scope.branch, null, '-').then(function (response) {
                scope.viewedConcepts.push(response);
                notificationService.clear();

                if (concept.messages) {
                  scope.selectConceptForFeedback(concept);
                  scaService.markTaskFeedbackRead($routeParams.projectKey, $routeParams.taskKey, concept.conceptId).then(function () {});
                }
              },
              function() {
                if (concept.messages) {
                  scope.viewFeedbackOnly = true;
                  scope.selectConceptForFeedback(concept);
                  scaService.markTaskFeedbackRead($routeParams.projectKey, $routeParams.taskKey, concept.conceptId).then(function () {});
                }
                notificationService.sendMessage('The selected concept was created and deleted in this task, it cannot be loaded anymore.');
              }
            );
            } else {
              scope.batchFeedback = false;
              if (actions && actions.length > 0) {
                if (actions.indexOf('selectConceptForFeedback') >= 0) scope.selectConceptForFeedback(concept);
                if (actions.indexOf('addToEdit') >= 0) scope.addToEdit(concept);
                if (actions.indexOf('viewConceptInTaxonomy') >= 0) scope.viewConceptInTaxonomy(concept);
              } else {
                scope.selectConceptForFeedback(concept);
                scope.addToEdit(concept);
                scope.viewConceptInTaxonomy(concept);
              }
            }
          };

          scope.selectNextConcept = function() {
            let breakout = false;
            let viewedList = [];

            angular.forEach(scope.viewedConcepts, function(viewedConcept) {
              viewedList.push(viewedConcept.conceptId);
            });

            angular.forEach(scope.conceptsToReviewViewed, function(item) {

              if(!viewedList.includes(item.conceptId) && !breakout) {
                scope.selectConceptForFeedback(item);
                scope.addToEdit(item);
                scope.viewConceptInTaxonomy(item);

                breakout = true;
              }
            });
          };

          scope.selectConceptForFeedback = function (concept) {
            concept.read = true;
            //console.debug('selecting concept for feedback', concept.conceptId, concept.read);
            scope.subjectConcepts = [concept];
            getViewedFeedback();
          };

          scope.selectConceptsForFeedback = function () {
            scope.subjectConcepts = [];
            angular.forEach(scope.conceptsToReviewViewed, function (item) {
              if (item.selected) {
                scope.subjectConcepts.push(item);
              }
            });

            if ( scope.subjectConcepts.length === 0) {
              scope.batchFeedback = false ;
              notificationService.sendWarning('No concepts selected', 5000);
              return
            }
            if (scope.subjectConcepts.length === 1) {
              scope.selectConcept( scope.subjectConcepts[0], 'addToEdit');
            } else {
              scope.batchFeedback = true;
              getViewedFeedback();
            }
          };

          scope.toggleFeedbackUnreadStatus = function (concept) {
            // console.debug('toggling task feedback status', concept.conceptId, concept.read);
            if (concept.read) {
              scaService.markTaskFeedbackUnread($routeParams.projectKey, $routeParams.taskKey, concept.conceptId).then(function (response) {
                concept.read = false;
              }, function (error) {
                notificationService.sendError('Unexpected error marking feedback unread');
              });
            } else {
              scaService.markTaskFeedbackRead($routeParams.projectKey, $routeParams.taskKey, concept.conceptId).then(function (response) {
                // do nothing
              }, function (error) {
                notificationService.sendError('Unexpected error marking feedback read');
              });
            }
            concept.read = !concept.read;
          };

          scope.getConceptsForTypeahead = function (searchStr) {
            return terminologyServerService.searchAllConcepts(metadataService.getBranch(), searchStr, null, 0, 50, null, true, true).then(function (response) {
              // remove duplicates
              for (var i = 0; i < response.items.length; i++) {
                for (var j = response.items.length - 1; j > i; j--) {
                  if (response.items[j].concept.conceptId === response.items[i].concept.conceptId) {
                    response.items.splice(j, 1);
                    j--;
                  }
                }
              }

              return response.items;
            });
          };

          /**
           * Creates an image object with data source
           * @param id
           * @param fsn
           * @returns {string}
           */
          function createConceptImg(conceptId, fsn) {

            // testing creation of image
            var can = document.createElement('canvas');
            var ctx = can.getContext('2d');

            ctx.canvas.width = ctx.measureText(fsn + ' ' + String.fromCharCode(parseInt('\uf040', 16))).width;
            ctx.canvas.height = 10;

            ctx.font = 'FontAwesome';
            ctx.fillStyle = '#2196F3';

            ctx.fillText(fsn + ' ' + String.fromCharCode(parseInt('\uf040', 16)), 0, 8);

            var img = new Image();
            img.src = ctx.canvas.toDataURL();

            return '<img src="' + img.src + '" id="' + conceptId + '-' + fsn + '-endConceptLink" />';
          }

          /**
           * Function to add search result from typeahead to the feedback
           * message
           * @param concept the concept object
           */
          scope.addConceptToFeedback = function (concept, element) {
            console.log(element);
            element.conceptFilter = null;
            var temp = scope.htmlVariable;
            var img = createConceptImg(concept.concept.conceptId, concept.concept.fsn);
            temp = temp + img + '&nbsp';
            scope.htmlVariable = temp;
          };

          /**
           * Function to unclaim a review by nulling the reviewer field and
           * returning the user to the home page
           */
          scope.unclaimReview = function () {
            var reviewers = scope.task.reviewers ? scope.task.reviewers : [];
            if (reviewers.length !== 0) {
              var i = reviewers.length;
              while (i--) {
                if (reviewers[i].username === $rootScope.accountDetails.login) {
                  reviewers.splice(i, 1);
                }
              }
            }
            scaService.unassignReview($routeParams.projectKey, $routeParams.taskKey, reviewers).then(function () {
              notificationService.sendMessage('Review unclaimed for task ' + $routeParams.taskKey, 5000);
              $location.url('review-tasks');
            }, function (error) {
              notificationService.sendError('Unexpected error unclaiming review: ' + error);
            });
          };

          /**
           * Function to add a dragged concept from the review/resolved list to
           * the feedback message
           * @param concept the concept object
           */
          scope.dropConceptIntoEditor = function (concept) {
            var img = createConceptImg(concept.conceptId, concept.term);
            scope.htmlVariable += '&nbsp ' + img + ' ';

          };

          scope.editReviewer = false;
          scope.listenReviewerTypeaheadEvent = function(event){
            event = event.event;

            // escape
            if (event.keyCode === 27) {
              scope.editReviewer = false;
            }
          };

          scope.addReviewer = function (reviewer) {
            let found = false;
            if (scope.task.reviewers) {
              for (let i =0; i < scope.task.reviewers.length; i++) {
                if (scope.task.reviewers[i].username === reviewer.username) {
                  found = true;
                  break;
                }
              }
            }
            if (!found) {
              var reviewers = scope.task.reviewers ? angular.copy(scope.task.reviewers) : [];
              reviewers.push(reviewer);
              scope.typeaheadLoading = true;
              notificationService.sendMessage('Adding reviewer...');
              scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, {'reviewers': reviewers}).then(function(){
                scope.editReviewer = false;
                scope.typeaheadLoading = false;
                scope.task.reviewers = reviewers;
                notificationService.sendMessage(reviewer.displayName + ' has been assigned to this task as REVIEWER', 5000);
              });
            }
          };

          scope.removeReviewer = function (reviewer) {
            modalService.confirm('Do you want to remove this reviewer?').then(function () {
              var reviewers = scope.task.reviewers ? angular.copy(scope.task.reviewers) : [];
              var i = reviewers.length;
              while (i--) {
                if (reviewers[i].username === reviewer.username) {
                  reviewers.splice(i, 1);
                }
              }
              notificationService.sendMessage('Removing reviewer...');
              scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, {'reviewers': reviewers}).then(function(){
                scope.task.reviewers = reviewers;
                notificationService.sendMessage(reviewer.displayName + ' has been unassigned from this task', 5000);
              });
            }, function () {
              // do nothing
            });
          };

          scope.switchToAddReviewer = function () {
            scope.editReviewer = true;
            $timeout(function () {
              document.getElementById("feedback-edit-reviewer").focus();
            }, 0);
          };

          scope.sortReviewers = function (reviewers) {
            var tempReviewr = null;
            var i = reviewers.length;
            while (i--) {
              if (reviewers[i].username === $rootScope.accountDetails.login) {
                tempReviewr = reviewers[i];
                reviewers.splice(i, 1);
              }
            }
            reviewers.unshift(tempReviewr);
            return reviewers;
          };

          scope.getAvailableUsers = function(exceptList) {
            if (users.length === 0) {
              return [];
            }
            var reviewers = [];
            if (exceptList) {
              reviewers = exceptList;
            }
            if (scope.task.reviewers) {
              scope.task.reviewers.forEach(function (reviewer) {
                reviewers.push(reviewer.username);
              });
            }
            return users.filter(item => -1 === reviewers.indexOf(item.username));
          };

          var feebackProjectTaxonomyViewList = [];
          scope.isProjectTaxonomyVisisble = function (concept) {
            for (var i =0; i < feebackProjectTaxonomyViewList.length; i++) {
              if (concept.conceptId === feebackProjectTaxonomyViewList[i]) {
                return true;
              }
            }
            return false;
          };

          var alreadyLoadedFsnForConceptsClassified = false;
          scope.loadFsnForConceptsClassified = function() {
            if (alreadyLoadedFsnForConceptsClassified || !scope.feedbackContainer.review || scope.feedbackContainer.review.conceptsClassified.length === 0) {
              return;
            }

            scope.loadingTermForClassifiedConcepts = true;

            var fetchTermForClassifiedConcepts = function (branch, idList, conceptsClassified, acceptLanguageValue, useFSN) {
              var deferred = $q.defer();
              terminologyServerService.bulkRetrieveFullConcept(idList, branch, acceptLanguageValue).then(function (response) {
                angular.forEach(response, function (concept) {
                  angular.forEach(conceptsClassified, function (reviewConcept) {
                    if (concept.conceptId === reviewConcept.conceptId) {
                      reviewConcept.term = useFSN ? concept.fsn : concept.pt;
                    }
                  });
                });
                deferred.resolve();
              });

              return deferred.promise;
            };

            var idList = [];
            for(var index = 0; index < scope.feedbackContainer.review.conceptsClassified.length; index++) {
              idList.push(scope.feedbackContainer.review.conceptsClassified[index].conceptId);
            }

            var i, j, temparray, chunk = 50;
            var promises = [];
            const acceptLanguageValue = getAcceptLanguageValue(scope.selectedLanguage);
            const useFSN = (scope.selectedLanguage && (scope.selectedLanguage.id === '900000000000509007' ||scope.selectedLanguage.id === '900000000000509007-fsn')) || !scope.isExtensionSet() || scope.useInternationalLanguageRefsets();
            for (i = 0, j = idList.length; i < j; i += chunk) {
              temparray = idList.slice(i, i + chunk);
              promises.push(fetchTermForClassifiedConcepts(scope.branch, temparray, scope.feedbackContainer.review.conceptsClassified, acceptLanguageValue, useFSN));            ;
            }

            // on resolution of all promises
            $q.all(promises).then(function () {
              alreadyLoadedFsnForConceptsClassified = true;
              scope.loadingTermForClassifiedConcepts = false;
              scope.conceptsClassifiedTableParams.reload();
            });
          };

          scope.$on('setExtensionMetadata', function (event, data) {
            initLanguagesDropdown();
          });

          scope.$on('viewProjectTaxonomy', function (event, data) {
            if (data.flag && feebackProjectTaxonomyViewList.indexOf(data.conceptId) === -1) {
              feebackProjectTaxonomyViewList.push(data.conceptId);
            } else {
              removeConceptFromProjectTaxonomyViewList(data.conceptId);
            }
          });

          function removeConceptFromProjectTaxonomyViewList(conceptId) {
            var i = feebackProjectTaxonomyViewList.length
            while (i--) {
              if (conceptId === feebackProjectTaxonomyViewList[i]) {
                feebackProjectTaxonomyViewList.splice(i,1);
              }
            }
          }

          scope.setTooltipPosition = function ($event) {
            var top = $event.target.getBoundingClientRect().top;
            var left = $event.target.getBoundingClientRect().left;
            var spanTags = angular.element($event.target).find('span');
            if(spanTags.length === 0) {
              var parents = angular.element($event.target).parent();
              top = parents[0].getBoundingClientRect().top;
              left = parents[0].getBoundingClientRect().left;
              spanTags = angular.element($event.target).parent().find('span');
            }

            angular.forEach(spanTags, function(tag) {
              angular.element(tag).css('top', top - 152);
              angular.element(tag).css('left', left - 45);
            });
          };

          scope.submitFeedback = function (requestFollowup) {

            if (!scope.htmlVariable || scope.htmlVariable.length === 0) {
              window.alert('Cannot submit empty feedback');
              return;
            }
            if (!scope.subjectConcepts || scope.subjectConcepts.length === 0) {
              window.alert('Cannot submit feedback without specifying concepts');
              return;
            }

            /**
             * Strip the constructed conceptImg and replace with a normal link
             * NOTE: This is necessary for two reasons: (1) textAngular allows
             * tag
             * "bleeding", such that inserting a link and typing after it will
             * cause the new text to insert into the link
             * (2) it is desirable to keep the concept link formaqt exactly the
             * same.  Using the image in the editor, then replacing for the
             * non-editable feedback allows this.
             * @type {string}
             */
            var feedbackStr = scope.htmlVariable.replace(/<img [^>]* id="(\d+)-(.*?(?=-endConceptLink"))[^>]*>/g, '<a ng-click="addToEditFromConceptId($1)" style="cursor:pointer">$2</a>');

            // Remove startfragment and endfragment from copy/paste
            feedbackStr = feedbackStr.replace(/<!--StartFragment-->/g, '');
            feedbackStr = feedbackStr.replace(/<!--EndFragment-->/g, '');

            notificationService.sendMessage('Submitting feedback...', null);

            // extract the subject concept ids
            var subjectConceptIds = [];
            angular.forEach(scope.subjectConcepts, function (subjectConcept) {
              subjectConceptIds.push(subjectConcept.conceptId);
            });

            scaService.addFeedbackToTaskReview($routeParams.projectKey, $routeParams.taskKey, feedbackStr, subjectConceptIds, requestFollowup).then(function (response) {


              // clear the htmlVariable and requestFolllowUp flag
              scope.htmlVariable = '';
              scope.conceptFilter = '';
              scope.requestFollowup = false;

              // re-retrieve the review
              // TODO For some reason getting duplicate entries on simple push
              // of feedback into list.... for now, just retrieving, though
              // this is inefficient

              const acceptLanguageValue = getAcceptLanguageValue(scope.selectedLanguage);
              const useFSN = scope.selectedLanguage && (scope.selectedLanguage.id === '900000000000509007' ||scope.selectedLanguage.id === '900000000000509007-fsn');
              reviewService.getLatestReview(scope.branch, $routeParams.projectKey, $routeParams.taskKey, acceptLanguageValue, useFSN).then(function (review) {
                // Re-popualte FSNs for classified concepts if already loaded.
                console.log(scope.feedbackContainer.review.conceptsClassified);
                angular.forEach(scope.feedbackContainer.review.conceptsClassified, function(item1) {
                  angular.forEach(review.conceptsClassified, function(item2) {
                    if (item1.conceptId === item2.conceptId && item1.term) {
                      item2.term = item1.term;
                    }
                  });
                });

                scope.feedbackContainer.review = review;
                notificationService.sendMessage('Feedback Submitted', 5000, null);
              }, function (error) {
                 scope.feedbackContainer.review = {errorMsg: error};
              });
            }, function () {
              notificationService.sendError('Error submitting feedback', 5000, null);
            });
          };

          var feedbackContainerDone = false; // 1 if feedback container done
          /**
           * Progress defined as 100 * (1/4  + 3/4 * feedbackContainerDone)
           * @returns {Number}
           */
          scope.getProgress = function () {
            return feedbackContainerDone ? 100 : 25;
          };

          function initialize() {
            initLanguagesDropdown();
            getUsers(0);
            scope.releaseNotesDisabled = metadataService.isExtensionSet();
            if (!scope.releaseNotesDisabled) {
              getBranchLineItems();
            }
          }

          initialize();
        }

      };
    }])
;
