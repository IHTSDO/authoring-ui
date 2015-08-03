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

        if (!scope.branch) {
          console.error('Classification display requires branch');
          return;
        }

        // helper function to populate names for all relationship display names
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

        scope.downloadClassification = function () {
          snowowlService.downloadClassification(scope.classification.id, $routeParams.projectId,
            $routeParams.taskId, scope.branch).then(function (response) {

            });
        };

        // notification of classification retrieved and set
        $rootScope.$on('setClassification', function (event, classification) {

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
        scope.startValidation = function() {
          scaService.startValidationForTask($routeParams.projectId, $routeParams.taskId).then(function(validation) {
            scope.validation = validation;
          })
        }

        // get latest validation
      }

    };
  }]);