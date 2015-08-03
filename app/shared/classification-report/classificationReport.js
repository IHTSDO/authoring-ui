'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('classificationReport', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'scaService', function ($rootScope, $filter, NgTableParams, $routeParams, scaService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        // the table params
        items: '=items'

      },
      templateUrl: 'shared/classification-report/classificationReport.html',

      link: function (scope, element, attrs, linkCtrl) {

        // listen for removal of concepts from editing panel
        scope.$on('stopEditing', function (event, data) {
          console.debug('classificationReport received stopEditing notification', data);
          if (!data || !data.concept) {
            console.error('Cannot handle stop editing event: concept must be supplied');
          } else {

            // check all current data items for edit re-enable
            angular.forEach(scope.items, function (item) {
              if (item.destinationId === data.concept.conceptId) {
                item.isLoaded = false;
              }
            });
          }
        });

        // listen for edit concpet notifications from this and other reports
        scope.$on('editConcept', function (event, data) {

          console.debug('editConcept notification received', data.conceptId);
          // flag this item as loaded, no need to update UI State
          angular.forEach(scope.items, function (item) {
            if (data.conceptId === item.destinationId) {
              item.isLoaded = true;
            }
          });
        });

        // scope function to broadcast element to edit panel
        scope.editDestinationConcept = function (item) {

          console.debug('editDestinationConcept', item);

          // issue notification of edit concept request
          $rootScope.$broadcast('editConcept', {conceptId: item.destinationId});

        };

        scope.tableParams = new NgTableParams({
          page: 1,            // show first page
          count: 10,          // count per page
          sorting: {
            changeNature: 'asc'     // initial sorting
          },
          orderBy: 'changeNature'
        }, {
          $scope: scope,
          total: scope.items ? scope.items.length : 0, // length of data
          getData: function ($defer, params) {

            if (!scope.items || scope.items.length === 0) {
              $defer.resolve([]);
            } else {
              var orderedData = params.sorting() ?
                $filter('orderBy')(scope.items, params.orderBy()) :
                scope.items;

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

          // get the current editing ui state
          scaService.getUIState(
            $routeParams.projectId, $routeParams.taskId, 'edit-panel')
            .then(function (uiState) {

              if (!uiState || Object.getOwnPropertyNames(uiState).length === 0) {
                scope.editPanelUiState = [];
              }
              else {
                scope.editPanelUiState = uiState;
              }

              // flag the relationships in data
              angular.forEach(scope.items, function (item) {
                item.isLoaded = scope.editPanelUiState.indexOf(item.destinationId) !== -1;
              });

              // reload the table
              scope.tableParams.reload();
            }
          );

        }

        // on data change, update the table
        scope.$watch('items', function () {
          updateTable();
        });

      }
    };
  }])
;