'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('classification', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'snowowlService', 'scaService', '$timeout',
    function ($rootScope, $filter, NgTableParams, $routeParams, snowowlService, scaService, $timeout) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // the branch
          branch: '=branch'
        },
        templateUrl: 'shared/classification/classification.html',

        link: function (scope, element, attrs, linkCtrl) {

          console.debug('classification display using branch', scope.branch);

          if (!scope.branch) {
            console.error('Classification display requires branch');
            return;
          }

          // helper function to populate names for all relationship display
          // names
          function getRelationshipNames(relationship) {
            // get source name
            snowowlService.getConceptPreferredTerm(relationship.sourceId, scope.branch).then(function (response) {
              relationship.sourceName = response.term;
            });
            // get destination name
            snowowlService.getConceptPreferredTerm(relationship.destinationId, scope.branch).then(function (response) {
              relationship.destinationName = response.term;
            });
            // get type name
            snowowlService.getConceptPreferredTerm(relationship.typeId, scope.branch).then(function (response) {
              relationship.typeName = response.term;
            });
          }

          $rootScope.$on('comparativeModelAdded', function (event, model) {
            snowowlService.getFullConcept(model.id, scope.branch).then(function (response) {
              var temp = response;
              var id = temp.conceptId;
              temp.conceptId = 'Before: ' + temp.conceptId;
              scope.modelConcept = response;
              snowowlService.getModelPreview(scope.classification.id, scope.branch, model.id).then(function (secondResponse) {
                scope.modelConceptAfter = secondResponse;
                scope.displayModels = true;
                $timeout(function () {
                  $rootScope.$broadcast('comparativeModelDraw');
                }, 1000);
              });
            });
          });
          var resizeClassificationSvg = function (concept, id) {
            var elem = document.getElementById('#' + concept.conceptId);
            var parentElem = document.getElementById('drawModel' + concept.conceptId);

            if (!elem || !parentElem) {
              return;
            }

            // set the height and width`
            var width = parentElem.offsetWidth - 30;
            var height = $('#editPanel-' + id).find('.editHeightSelector').height() + 41;
            if (width < 0) {
              return;
            }
            console.log(elem);

            elem.setAttribute('width', width);
            elem.setAttribute('height', height);
          };

          scope.saveClassification = function () {
            snowowlService.saveClassification(scope.branch, scope.classification.id).then(function (response) {

            });
          };

         /* var saveData = (function () {
            alert('ohai');
            var a = document.createElement("a");
            document.body.appendChild(a);
            //a.style = "display: none";
            return function (data, fileName) {
              var json = JSON.stringify(data),
                blob = new Blob([json], {type: "octet/stream"}),
                url = window.URL.createObjectURL(blob);

              // console.debug('ohai', url, fileName);
              a.href = url;
              a.download = fileName;
              a.click();
              window.URL.revokeObjectURL(url);
            };
          }());

          var data = {x: 42, s: "hello, world", d: new Date()},
            fileName = "my-download.json";

          saveData(data, fileName);
*/
          scope.dlcDialog = (function (data, fileName) {

            console.debug('classification data: ', data, fileName);

            // create the hidden element
            var a = document.createElement("a");
            document.body.appendChild(a);
            //a.style = "display: none";

            return function (data, fileName) {
              var
                blob = new Blob([data], {type: "text/csv"}),
                url = window.URL.createObjectURL(blob);

              console.debug('blob', blob);
              console.debug('url', url);
              a.href = url;
              a.download = fileName;
              a.click();
              window.URL.revokeObjectURL(url);
            };
          } ());

          scope.downloadClassification = function () {

            snowowlService.downloadClassification(scope.classification.id, scope.branch).then(function (data) {
              console.debug('classification csv retrieved, opening dialog with', data);
              var fileName = 'classifier_' + $routeParams.taskId;
              scope.dlcDialog(data.data, fileName);
            });
          };

          // notification of classification retrieved and set
          $rootScope.$on('setClassification', function (event, classification) {

            console.debug('setting classification', classification);

            if (!classification) {
              console.error('Received setClassification notification, but no classification was sent');
              return;
            }

            scope.classification = classification;

            // get the relationship names
            angular.forEach(scope.classification.relationshipChanges, function (item) {
              getRelationshipNames(item);
            });
            angular.forEach(scope.classification.equivalentConcepts, function (item) {
              getRelationshipNames(item);
            });

            // separate the redundant stated relationships into own array
            scope.classification.redundantStatedRelationships = [];
            angular.forEach(scope.classification.relationshipChanges, function (item) {
              if (item.changeNature === 'REDUNDANT') {
                scope.classification.redundantStatedRelationships.push(item);
              }
            });

          });

          ////////////////////////////////////
          // Validation Functions
          ////////////////////////////////////

          // start latest validation
          scope.startValidation = function () {
            scaService.startValidationForTask($routeParams.projectId, $routeParams.taskId).then(function (validation) {
              scope.validation = validation;
            })
          }

          // get latest validation
        }

      };
    }]);