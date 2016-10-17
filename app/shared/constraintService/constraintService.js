'use strict';

angular.module('singleConceptAuthoringApp')
  .service('constraintService', ['$http', '$rootScope', '$q', 'snowowlService', 'metadataService','templateService',
    function ($http, $rootScope, $q, snowowlService, metadataService, templateService) {


      // Search str matches fsn or id of provided attributes
      function isAttributeAllowedForArray(searchStr, attributesAllowed) {
        var matches = attributesAllowed.filter(function (item) {
          return item.fsn.term.toLowerCase() === searchStr.toLowerCase() || item.id === searchStr;
        });
        return matches.length > 0;
      }

      // Search str matches fsn or id of attributes dynamically computed from concept
      function isAttributeAllowedForConcept(searchStr, concept, branch) {
        var deferred = $q.defer();
        getDomainAttributes(concept, branch).then(function (attrs) {
          if (isAttributeAllowedForArray(searchStr, attrs)) {
            deferred.resolve();
          } else {
            deferred.reject(error);
          };
        });
        return deferred.promise;
      }

      function isValueAllowedForType(typeId, valueName, concept, branch) {
        var deferred = $q.defer();
        console.debug('isValueAllowedForType', typeId, valueName, concept, branch);
        getConceptsForValueTypeahead(typeId, valueName, branch).then(function (response) {
          if (response.length === 0) {
            deferred.reject();
          } else {
            deferred.resolve();
          }
        });
        return deferred.promise;
      }

      function getDomainAttributes(concept, branch) {
        var deferred = $q.defer();
        if (!concept || !branch) {
          deferred.reject('Arguments not supplied');
        } else {
          // construct comma-separated list of ids
          var idList = '';
          angular.forEach(concept.relationships, function (relationship) {
            if (relationship.active === true && relationship.type.conceptId === '116680003' && relationship.target.conceptId && relationship.characteristicType !== 'INFERRED_RELATIONSHIP') {
              idList += relationship.target.conceptId + ',';
            }
          });
          idList = idList.substring(0, idList.length - 1);

          snowowlService.getDomainAttributes(branch, idList).then(function (attrs) {
            deferred.resolve(attrs.items);
          }, function (error) {
            deferred.reject(error.message);
          });
        }
        return deferred.promise;
      }

      function getConceptsForValueTypeahead(attributeId, searchStr, concept, branch) {
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
        }, function (error) {
          deferred.reject(error.message);
        });
        return deferred.promise;
      }


// expose functions
      return {
        // typeahead and value restrictions
        getDomainAttributes: getDomainAttributes,
        getConceptsForValueTypeahead: getConceptsForValueTypeahead,

        // utility functions
        isAttributeAllowedForArray: isAttributeAllowedForArray,
        isAttributeAllowedForConcept: isAttributeAllowedForConcept,
        isValueAllowedForType: isValueAllowedForType
      }
    }])
;
