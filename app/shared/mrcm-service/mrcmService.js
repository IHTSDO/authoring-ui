'use strict';

angular.module('singleConceptAuthoringApp')
  .service('mrcmService', ['$http', '$rootScope', '$q', 'snowowlService',
    function ($http, $rootScope, $q, snowowlService) {


      /**
       * Get the allowable domain attributes for concept and branch
       * @param concept the concept (full JSON
       * @param branch the branch (e.g. 'MAIN')
       */
      function getDomainAttributes(concept, branch) {
        var deferred = $q.defer();
        var idList = '';
        angular.forEach(concept.relationships, function (relationship) {
          // add to id list if: active, Is A relationship, target
          // specified, and not inferred
          if (relationship.active === true && relationship.type.conceptId === '116680003' && relationship.target.conceptId && relationship.characteristicType !== 'INFERRED_RELATIONSHIP') {
            idList += relationship.target.conceptId + ',';
          }
        });
        idList = idList.substring(0, idList.length - 1);

        snowowlService.getDomainAttributes(branch, idList).then(function (response) {
          deferred.resolve(response.items);
        }, function (error) {
          deferred.reject(error.message);
        });
        return deferred.promise;
      };

      function getConceptsForValueTypeahead(attributeId, searchStr, branch) {
        var deferred = $q.defer();
        snowowlService.getAttributeValues(branch, attributeId, searchStr).then(function (response) {

          if (!response) {
            deferred.resolve([]);
          }

          // remove duplicates
          for (var i = 0; i < response.length; i++) {
            var status = 'FD';
            if (response[i].definitionStatus === 'PRIMITIVE') {
              status = 'P';
            }
            if (response[i].fsn) {
              response[i].tempFsn = response[i].fsn.term + ' - ' + status;
              for (var j = response.length - 1; j > i; j--) {
                if (response[j].id === response[i].id) {
                  response.splice(j, 1);
                  j--;
                }
              }
            }
          }
          deferred.resolve(response);
        }, function(error) {
          deferred.reject(error.message);
        });
        return deferred.promise;
      }


      /**
       * Function taking names of concepts and determining if they are valid
       * as type/value
       * @param type the relationship type
       * @param typeName the name of the relationship type (used for user display)
       * @param value the target concept name
       * @returns {*|promise}
       */
      function validateMrcmRulesForTypeAndValue(type, typeName, value, branch) {
        var deferred = $q.defer();

        var errors = [];
        // check type (if not blank)
        if (type) {

          if (getConceptForFullAttribute(typeName).length === 0) {
            errors.push('Attribute type ' + typeName + ' is disallowed.');
            deferred.resolve(errors);
          } else {
            // check target (if not blank)
            if (value) {
              getConceptsForValueTypeahead(type, value).then(function (response) {
                if (response.length === 0) {
                  errors.push('Attribute value ' + value + ' is disallowed for attribute type ' + type + '.');
                }
                deferred.resolve(errors);
              });
            } else {
              deferred.resolve(errors);
            }
          }
        } else {
          deferred.resolve(errors);
        }

        return deferred.promise;
      }

      // expose functions
      return {
        getDomainAttributes: getDomainAttributes,
        getConceptsForValueTypeahead : getConceptsForValueTypeahead,
        validateMrcmRulesForTypeAndValue: validateMrcmRulesForTypeAndValue
      }
    }])
;
