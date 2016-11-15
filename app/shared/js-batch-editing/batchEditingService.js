'use strict';

/**
 * Promotion Service
 * Provides validation and prerequisite testing for task and project promotion
 */
angular.module('singleConceptAuthoringApp')
  .service('batchEditingService', ['scaService', 'snowowlService', '$q', 'componentAuthoringUtil', 'templateService', 'constraintService',
    function (scaService, snowowlService, $q, componentAuthoringUtil, templateService, constraintService) {


      var batchConcepts;

      //
      // HandsOnTable utility functions
      //

      function getHotColumnsFromConcept(concept) {
        var columns = [{
          data: 'sctid',
          title: 'SCTID',
          readOnly: true
        }, {
          data: 'fsn',
          title: 'FSN',
          readOnly: false
        }];

        // get the target slots
        var slotCt = 0;
        angular.forEach(concept.relationships, function (r) {
          if (r.targetSlot && r.targetSlot.slotName) {
            columns.push({
              data: 'targetSlot_' + slotCt + '.target.fsn',
              title: r.targetSlot.slotName,
              readOnly: false,
              type: 'autocomplete',
              source : [1, 2, 3, 4],
              allowInvalid: true,
              strict: false
            });
          }
        });

        console.debug('-> concept columns', columns);
        return columns;
      }

      function getHotRowForConcept(concept) {

        // get the slot type
        var row = {
          sctid : snowowlService.isSctid(concept.conceptId) ? concept.conceptId : '',
          conceptId: concept.conceptId,
          fsn: componentAuthoringUtil.getFsnForConcept(concept),
        };

        // get the target slots
        var slotCt = 0;
        angular.forEach(concept.relationships, function (r) {
          if (r.targetSlot && r.targetSlot.slotName) {
            row['targetSlot_' + slotCt++] = {
              'groupId': r.groupId,
              'type': r.type,
              'slotName': r.targetSlot.slotName,
              'target': r.target,
              'dataType' : r.targetSlot ? 'text' : 'autocomplete',
              'allowableECL' : r.targetSlot.allowableRangeECL
            };

          }
        });


        return row;
      }

      function updateConceptFromHotRow(row) {
        var deferred = $q.defer();
        var concept = getBatchConcept(row.conceptId);

        // apply the target slots
        var slotKeys = Object.keys(row).filter(function (key) {
          return key.indexOf('targetSlot') !== -1;
        });

        var updatePromises = [];
        angular.forEach(slotKeys, function (slotKey) {
          var targetSlot = row[slotKey]
          angular.forEach(concept.relationships, function (r) {
            if (r.groupId === targetSlot.groupId && r.type.conceptId === targetSlot.type.conceptId) {
              r.target = targetSlot.target;
              updatePromises.push(templateService.updateTargetSlot(concept, concept.template, r));
            }
          });
        });

        $q.all(updatePromises).then(function() {
          var revisedConcept = getHotRowForConcept(concept);
          deferred.resolve(revisedConcept);
        }, function(error) {
          deferred.reject(error);
        });

        return deferred.promise;
      }


      //
      // CRUD operations
      //

      function setBatchConcepts(concepts) {
        batchConcepts = concepts;
      }

      function getBatchConcepts(concepts) {
        return batchConcepts;
      }

      function getBatchConcept(conceptId) {
        try {
          return batchConcepts.filter(function (c) {
            return c.conceptId === conceptId;
          })[0];
        } catch (e) {
          return null;
        }
      }

      function updateBatchConcept(concept) {

      }

      function removeBatchConcept(concept) {

      }

      return {

        // HOT functions
        getHotRowForConcept: getHotRowForConcept,
        updateConceptFromHotRow: updateConceptFromHotRow,
        getHotColumnsFromConcept: getHotColumnsFromConcept,

        // CRUD operations
        setBatchConcepts: setBatchConcepts,
        getBatchConcepts: getBatchConcepts,
        getBatchConcept: getBatchConcept,
        updateBatchConcept: updateBatchConcept,
        removeBatchConcept: removeBatchConcept

      }
    }]);
