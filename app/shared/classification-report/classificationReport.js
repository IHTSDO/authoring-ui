'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('classificationReport', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'scaService', function ($rootScope, $filter, NgTableParams, $routeParams, scaService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        // the table params
        items: '=items',
        editable: '=',
        type: '='

      },
      templateUrl: 'shared/classification-report/classificationReport.html',

      link: function (scope, element, attrs, linkCtrl) {
        console.log(scope.type);
        // listen for removal of concepts from editing panel
        scope.$on('stopEditing', function (event, data) {
          console.debug('classificationReport received stopEditing notification', data);
          if (!data || !data.concept) {
            console.error('Cannot handle stop editing event: concept must be supplied');
          } else {

            // check all current data items for edit re-enable
            angular.forEach(scope.items, function (item) {
              console.debug('comparing', item.sourceId, data.concept.conceptId);
              if (item.sourceId === data.concept.conceptId) {
                item.isLoaded = false;
              }
            });
          }
        });

        // scope function to broadcast element to edit panel
        scope.editSourceConcept = function (item) {

          item.isLoaded = true;

          // issue notification of edit concept request
          $rootScope.$broadcast('viewClassificationConcept', {conceptId: item.sourceId});

        };

        // scope function to broadcast element to edit panel
        scope.editEquivalentConcept = function (id) {
          // issue notification of edit concept request
          $rootScope.$broadcast('viewCLassificationConcept', {conceptId: id});

        };

        scope.tableParams = new NgTableParams({
          page: 1,            // show first page
          count: 10,          // count per page
          sorting: {
            changeNature: 'asc'     // initial sorting
          },
          orderBy: 'changeNature'
        }, {
          filterDelay: 50,
          total: scope.items ? scope.items.length : 0, // length of data
          getData: function ($defer, params) {
            var searchStr = params.filter().search;
            var mydata = [];
            if (!scope.items || scope.items.length === 0) {
              $defer.resolve([]);
            } else {
              if(scope.type === 'equivalence')
              {
                  if (searchStr) {
                  mydata = scope.items.filter(function (item) {
                    return item.leftConceptLabel.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                    || item.leftConceptLabel.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                  });
                } else {
                    mydata = scope.items;
                }
              }
              else{
                  if (searchStr) {
                      mydata = scope.items.filter(function (item) {
                        return item.source.fsn.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                        || item.type.fsn.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                        || item.destination.fsn.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                      });
                    } else {
                        mydata = scope.items;
                    }
              }
                
              var orderedData = params.sorting() ?
                $filter('orderBy')(mydata, params.orderBy()) :
                mydata;
                params.total(orderedData.length);
             // console.debug(orderedData);
                $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }
          }
        });
        scope.viewComparativeModel = function (model) {
          $rootScope.$broadcast('comparativeModelAdded', {id: model});
        };
        scope.parseCharacteristic = function (id) {
          if (id === '900000000000010007') {
            return 'Stated';
          }
          else {
            return 'Inferred';
          }
        };

        // function to set flags on whether concepts can be edited
        // also reloads ng-table
        function updateTable() {

          if (scope.editable) {

            // get the current editing ui state
            scaService.getUiStateForTask(
              $routeParams.projectKey, $routeParams.taskKey, 'edit-panel')
              .then(function (uiState) {

                if (!uiState || Object.getOwnPropertyNames(uiState).length === 0) {
                  scope.editPanelUiState = [];
                }
                else {
                  scope.editPanelUiState = uiState;
                }

                // flag the relationships in data
                angular.forEach(scope.items, function (item) {
                  item.isLoaded = scope.editPanelUiState.indexOf(item.sourceId) !== -1;
                });

                // reload the table
                scope.tableParams.reload();
              });
          } else {
            scope.tableParams.reload();
          }
        }

        // on data change, update the table
        scope.$watch('items', function () {
          updateTable();
        });

      }
    };
  }])
;