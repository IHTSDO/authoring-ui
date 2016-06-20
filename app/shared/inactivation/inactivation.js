'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('inactivation', ['$rootScope', '$filter', '$q', 'ngTableParams', '$routeParams', 'scaService', 'snowowlService', 'notificationService', '$timeout', '$modal',
    function ($rootScope, $filter, $q, NgTableParams, $routeParams, scaService, snowowlService, notificationService, $timeout, $modal) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          //concept that is being inactivated
          inactivationConcept: '=',
            
          children: '=',

          // flag for whether or not to allow editing controls
          editable: '&',

          // branch this report is good for
          branch: '='
        },
        templateUrl: 'shared/inactivation/inactivation.html',

        link: function (scope, element, attrs, linkCtrl) {


          scope.editable = attrs.editable === 'true';
          scope.taskKey = $routeParams.taskKey;
            
          scope.getSNF = function(id){
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

          // local variables for ng-table population
          scope.assertionsFailed = [];
          scope.failures = [];

          // declare table parameters
          scope.relsTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {failureCount: 'desc'},
              orderBy: 'failureCount'
            },
            {
              filterDelay: 50,
              total: scope.assertionsFailed ? scope.assertionsFailed.length : 0,
              getData: function ($defer, params) {

                if (!scope.assertionsFailed || scope.assertionsFailed.length === 0) {
                  $defer.resolve([]);
                } else {

                  var orderedData = scope.assertionsFailed;

                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );

          // declare table parameters
          scope.assocsTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {userModified: 'desc'},
              orderBy: 'userModified'
            },
            {
              total: scope.failures ? scope.failures.length : 0,
              getData: function ($defer, params) {

                console.debug('getData failures', scope.failures);

                // clear the loading variable on reload
                scope.failuresLoading = false;

                if (!scope.failures || scope.failures.length === 0) {
                  $defer.resolve([]);
                } else {

                  var orderedData = scope.failures;
                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  console.debug('getData failures orderedData', orderedData);
                  $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );

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

          /**
           * Function to add a concept by id to the list
           * Used by single editConcept or multiple editSelectedConcept methods
           * @param conceptId
           * @returns {*|promise}
           */
          function editConceptHelper(conceptId) {
            var deferred = $q.defer();

            snowowlService.getFullConcept(conceptId, scope.branch).then(function (response) {
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

          scope.editConcept = function (conceptId) {

            var existingIds = scope.viewedConcepts.map(function (viewed) {
              return viewed.conceptId;
            });

            // NOTE: Requires string conversion based on RVF format
            if (existingIds.indexOf(conceptId.toString()) !== -1) {
              notificationService.sendWarning('Concept already loaded', 5000);
            } else {

              notificationService.sendMessage('Loading concept...');
              editConceptHelper(conceptId).then(function (response) {
                notificationService.sendMessage('Concept loaded', 5000);

                $timeout(function () {
                  $rootScope.$broadcast('viewTaxonomy', {
                    concept: {
                      conceptId: response.conceptId,
                      fsn: response.fsn
                    }
                  });
                }, 500);
              }, function (error) {
                notificationService.sendError('Error loading concept', 5000);
              });
            }
          };

          scope.editSelectedConcepts = function () {
            var nConcepts = 0;
            notificationService.sendMessage('Loading concepts...');

            console.debug(scope.failures);

            // construct array of concept ids for previously loaded concepts
            var existingIds = scope.viewedConcepts.map(function (viewed) {
              return viewed.conceptId;
            });

            var conceptsToAdd = [];
            angular.forEach(scope.failures, function (failure) {
              if (failure.selected && existingIds.indexOf(failure.errorMessage.conceptId.toString()) === -1) {
                conceptsToAdd.push(failure.errorMessage.conceptId);
              }
            });

            console.debug('existing ids', existingIds);

            // cycle over all failures
            var conceptsLoaded = 0;
            angular.forEach(conceptsToAdd, function (conceptId) {

              console.debug('loading concept ', conceptId);

              // add the concept
              editConceptHelper(conceptId).then(function () {

                if (++conceptsLoaded === conceptsToAdd.length) {
                  notificationService.sendMessage('Concepts loaded.', 5000);
                }
              }, function (error) {
                notificationService.sendError('Error loading at least one concept');
              });
            });
          };
        }

      };

    }])
;