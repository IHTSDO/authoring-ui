'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('exceptions', ['$rootScope', '$filter', '$q', 'ngTableParams', '$routeParams', 'configService', 'validationService', 'scaService', 'terminologyServerService', 'notificationService', 'accountService', '$timeout', '$modal','metadataService', 'aagService',
    function ($rootScope, $filter, $q, NgTableParams, $routeParams, configService, validationService, scaService, terminologyServerService, notificationService, accountService, $timeout, $modal, metadataService, aagService) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // branch this report is good for
          branch: '=',

          // overridden labbels (optional)
          overriddenLabels: '=?',

          // code systesm flag (optional)
          isCodeSystem: '=?',

          exceptionType: '=?'
        },
        templateUrl: 'shared/exception-list/exceptionList.html',

        link: function (scope, element, attrs, linkCtrl) {

          scope.isCodeSystem = attrs.isCodeSystem === 'true';
          scope.allWhitelistItems = [];
          scope.viewFullListException = false;
          scope.exceptionLoading = false;
          scope.exceptionType = attrs.exceptionType ? attrs.exceptionType : 'ALL';
          scope.showExpirationDate = scope.exceptionType === 'ALL' || scope.exceptionType === 'TEMPORARY';

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
                scope.allWhitelistItems.forEach(function(item) {
                  orderedData.push({
                    id: item.id,
                    failureText: item.failureText,
                    assertionUuid: item.validationRuleId,
                    branchRoot: item.branch,
                    conceptFsn: item.conceptFsn,
                    semanticTag: item.semanticTag,
                    conceptId: item.conceptId,
                    componentId: item.componentId,
                    timestamp: new Date(item.creationDate).getTime(),
                    user: item.userId,
                    expirationDate: item.expirationDate,
                    reason: item.reason
                  });
                });

                params.total(orderedData.length);
                orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;
                orderedData = orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count());
                $defer.resolve(orderedData);
              }
            }
          );

          scope.toggleViewFullListExceptions = function () {
            scope.allWhitelistItems = [];
            scope.exclusionsTableParams.reload();
            retrieveWhitelist().then(function() {
              scope.exclusionsTableParams.reload();
            });
          };

          var dlcDialog = (function (data, fileName) {
            // create the hidden element
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

          scope.downloadExceptions = function () {
            var data = [];
            data.push({
              'conceptId': 'Concept',
              'conceptFsn': 'FSN',
              'componentId': 'Component ID',
              'failureText': 'Error Message',
              'creationDate': 'Date Added',
              'user': 'User'
            });
            scope.allWhitelistItems.forEach(function(item) {
              data.push({
                'conceptId': item.conceptId,
                'conceptFsn': item.conceptFsn,
                'componentId': item.componentId,
                'failureText': item.failureText ? item.failureText : '',
                'creationDate': item.creationDate,
                'user': item.userId
              });
            })
            dlcDialog(convertToCSV(data), 'Exceptions_' + (new Date()).getTime());
          };

          function getWhitelistCreationDate() {
            var deferred = $q.defer();
            if (scope.viewFullListException || scope.isCodeSystem) {
              let codeSystemShortname;
              if (scope.isCodeSystem) {
                codeSystemShortname = $routeParams.codeSystem;
              } else if (scope.task) {
                codeSystemShortname = metadataService.getProjectForKey(scope.task.projectKey).codeSystem.shortName;
              } else {
                codeSystemShortname = metadataService.getBranchMetadata().codeSystem.shortName;
              }
              terminologyServerService.getAllCodeSystemVersionsByShortName(codeSystemShortname).then(function(response) {
                if (response.data.items && response.data.items.length > 0) {
                  if (scope.isCodeSystem) {
                    deferred.resolve(scope.viewFullListException ? response.data.items[0].importDate : response.data.items[response.data.items.length-1].importDate);
                  } else {
                    deferred.resolve(response.data.items[response.data.items.length-1].importDate);
                  }
                }
              });
            } else {
              terminologyServerService.getLastPromotionTimeToMain(scope.branch).then(function(promotionDate) {
                deferred.resolve(promotionDate);
              });
            }
            return deferred.promise;
          }

          function retrieveWhitelist() {
            var deferred = $q.defer();
            scope.exceptionLoading = true;
            // filter out from AAG whitelist
            getWhitelistCreationDate().then(function (creationDate) {
              let branch = '';
              if(scope.viewFullListException && !scope.isCodeSystem && scope.task){
                  branch = scope.branch.substr(0, scope.branch.lastIndexOf("\/"));
                  branch = branch.substr(0, branch.lastIndexOf("\/"));
              }
              else if(scope.viewFullListException && !scope.isCodeSystem && !scope.task){
                  branch = scope.branch.substr(0, scope.branch.lastIndexOf("\/"));
              }
              else {
                  branch = scope.branch;
              }
              aagService.getWhitelistItemsByBranchAndDate(branch, new Date(creationDate).getTime(), scope.exceptionType).then(function(whitelistItems) {
                if(whitelistItems){
                  let idList = [];
                  angular.forEach(whitelistItems, function (item) {
                      if(item.assertionFailureText !== null){
                          item.failureText = item.assertionFailureText;
                      }
                      idList.push(item.conceptId);
                  });

                  terminologyServerService.bulkGetConceptUsingPOST(idList, scope.branch, idList.length).then(function (concepts) {
                    angular.forEach(concepts.items, function (concept) {
                        angular.forEach(whitelistItems, function (failure) {
                          if(failure.conceptId === concept.conceptId){
                              failure.conceptFsn = concept.fsn.term;
                          }
                        });
                    });
                    scope.allWhitelistItems = whitelistItems;

                    scope.exceptionLoading = false;
                    deferred.resolve();
                  });
                } else {
                  scope.allWhitelistItems = [];
                  scope.exceptionLoading = false;
                  deferred.resolve();
                }
              }, function() {
                scope.allWhitelistItems = [];
                scope.exceptionLoading = false;
                deferred.resolve();
              });
            }, function() {
              scope.allWhitelistItems = [];
              scope.exceptionLoading = false;
              deferred.resolve();
            });
            return deferred.promise;
          };

          function convertToCSV(objArray) {
            var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
            var str = '';

            for (var i = 0; i < array.length; i++) {
                var line = '';
                for (var index in array[i]) {
                    if (line != '') line += '\t'

                    line += array[i][index];
                }

                str += line + '\r\n';
            }

            return str;
          }

          // creates element for dialog download of classification data
          scope.dlcDialog = (function (data, fileName) {

            // create the hidden element
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

          scope.removeUserExclusionFromTable = function (failure) {
            if (failure.id) {
              aagService.removeFromWhitelist(failure.id).then(function() {
                scope.allWhitelistItems = scope.allWhitelistItems.filter(function(item) {
                  return item.id !== failure.id;
                });
                scope.exclusionsTableParams.reload();
                $rootScope.$broadcast('removeExceptionFromWhitelist');
              });
            }
          };

          function initialize() {
            retrieveWhitelist().then(function() {
              scope.exclusionsTableParams.reload();
            });

            $('body').on('mouseup', function(e) {
                if(!$(e.target).closest('.popover').length) {
                    $('.popover').each(function(){
                        if(($(this).find('.reason-more').length != 0) && $(this).hasClass("in")) {                          
                          var elm = $(this).find("[component-id]");
                          var componentId = $(elm[0]).attr("component-id");
                          if(componentId) {
                            document.getElementById(componentId).click();
                          }
                        }
                    });
                }
            });
          }

          initialize();

          scope.$on('reloadExceptions', function(event, data) {
            if (data.type === scope.exceptionType) {
              scope.allWhitelistItems = [];
              scope.exclusionsTableParams.reload();
              initialize();
            }
          });
        }
      };
    }]);
