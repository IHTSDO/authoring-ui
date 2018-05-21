'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('classificationReport', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'scaService', 'notificationService', function ($rootScope, $filter, NgTableParams, $routeParams, scaService, notificationService) {
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
          if (!data || !data.concept) {
            console.error('Cannot handle stop editing event: concept must be supplied');
          } else {

            // check all current data items for edit re-enable
            angular.forEach(scope.items, function (item) {
              if (item.sourceId === data.concept.conceptId) {
                item.isLoaded = false;
              }
            });
          }
        });

        // scope function to broadcast element to edit panel
        scope.editSourceConcept = function (item) {

          // do nothing if editable
          if (!scope.editable) {
            // do nothing
          }
          else if (item.isLoaded === true) {
            notificationService.sendWarning('Concept already loaded', 5000);
          } else {
            item.isLoaded = true;

            // issue notification of edit concept request
            $rootScope.$broadcast('viewClassificationConcept', {conceptId: item.sourceId});
          }
        };

        // scope function to broadcast element to edit panel
        scope.editEquivalentConcept = function (id) {
          // issue notification of edit concept request
          console.log(id);
          $rootScope.$broadcast('viewClassificationConcept', {conceptId: id});

        };

        scope.tableParams = new NgTableParams({
          page: 1,            // show first page
          count: 10,          // count per page
          sorting: {
            changeNature: 'asc',    // initial sorting
            sourceFsn: 'asc',
            group : 'asc',
            typeFsn : 'asc',
            destinationFsn :  'asc'
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
              if (scope.type === 'equivalence') {
                if (searchStr) {
                  mydata = scope.items.filter(function (item) {
                    return item.leftConceptLabel.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 || item.leftConceptLabel.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                  });
                } else {
                  mydata = scope.items;
                }
              }
              else {
                if (searchStr) {
                  let searchResults = searchStr.split(/[ ,]+/);

                  mydata = scope.items;

                  angular.forEach(searchResults, function(word) {
                    mydata = mydata.filter(function (item) {
                      return item.sourceFsn.toLowerCase().indexOf(word.toLowerCase()) > -1 || item.typeFsn.toLowerCase().indexOf(word.toLowerCase()) > -1 || item.destinationFsn.toLowerCase().indexOf(word.toLowerCase()) > -1;
                    });
                  });
                } else {
                  mydata = scope.items;
                }
              }

              var orderedData = params.sorting() ?
                $filter('orderBy')(mydata, params.orderBy()) :
                mydata;
              params.total(orderedData.length);
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


        // on data change, update the table
        scope.$watch('items', function () {
          scope.tableParams.reload();
        });

      }
    };
  }])
;
