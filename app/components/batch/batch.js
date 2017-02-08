'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.batch', [
  //insert dependencies here
  'ngRoute',
  'ngTable'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/{projectKey}/{taskKey}/batch', {
        controller: 'BatchCtrl',
        templateUrl: 'components/batch/batch.html'
      });
  })

  .controller('BatchCtrl', function BatchCtrl($scope, $compile, $q, templateService, componentAuthoringUtil) {

      $scope.branch = 'MAIN';

      templateService.getTemplates().then(function (response) {
        $scope.templates = response;
      });

      $scope.selectBatchTemplate = function (template) {
        templateService.selectTemplate(template).then(function () {
          $scope.createConcept();
        });
      };

      $scope.hot = {
        columns: [],
        settings: {},
        data: []

      };

      function getSlotType(concept) {
        for (var i = 0; i < concept.relationships.length; i++) {
          if (concept.relationships[i].targetSlot && concept.relationships[i].targetSlot.slotName) {
            return concept.relationships[i].type.fsn;
          }
        }
      }

      $scope.getSlotType = function () {
        return $scope.slotType;
      };

      function getRowForConcept(concept) {
        // get the slot type
        var row = {
          conceptId: concept.conceptId,
          fsn: componentAuthoringUtil.getFsnForConcept(concept),
          pt: componentAuthoringUtil.getPtForConcept(concept, '900000000000509007'),
          slotTarget: '',
          editHtml: '<i class="glyphicon glyphicon-edit"></i>'
        };
        return row;
      }

      function updateConceptFromRow(row) {
        // TODO Find concept by id, update fields
      }

      function getColumnObjectForField(field) {
        var col = {
          field: field,
          name: null,
          disabled: false
        };
        switch (field) {
          case 'conceptId':
            col.name = 'SCTID';
            col.disabled = true;
            break;
          case 'fsn':
            col.name = 'FSN';
            break;
          case 'pt':
            col.name = 'PT';
            break;
          case 'slotTarget':
            col.name = $scope.slotType;
            break;
          default:
            col.name = '???';
        }
        return col;
      }

      function refreshColumns() {
        $scope.hot.columns = [];

        // get columsn from first row entry
        if ($scope.hot.data.length > 0) {
          var row = $scope.hot.data[1];
          for (var key in row) {
            $scope.hot.columns.push(getColumnObjectForField(key));
          }
        }
      }

      $scope.populateHotTable = function (template, batchSize) {
        $scope.hot.data = [];
        $scope.concepts = [];

        var promises = [];

        for (var i = 0; i < batchSize; i++) {
          promises.push(templateService.createTemplateConcept(template));
        }

        $q.all(promises).then(function () {
          for (var i = 0; i < concepts.length; i++) {
            templateService.storeTemplateForConcept($routeParms.projectKey, concepts[i].conceptId, template);
            $scope.concepts.push(concepts[i]);
            $scope.hot.data.push(getRowForConcept(concepts[i]));
          }

          $scope.slotType = getSlotType(concepts[1]);
          refreshColumns();

        });


      }

      $scope.hot.renderer = function (hotInstance, td, row, col, prop, value) {
        var el = $compile('<a href="" ng-click="edit(' + row + ')">' + value + '</a>')($scope);
        if (!td.firstChild) {
          td.appendChild(el[0]);
        }
        return td;
      };

      $scope.editBatchConcept = function (row) {
        var conceptId = $scope.hot.data[row].conceptId;
        $scope.viewedConcept = $scope.concepts.filter(function (c) {
          return c.conceptId === conceptId;
        })[0];
      };


    }
  );
