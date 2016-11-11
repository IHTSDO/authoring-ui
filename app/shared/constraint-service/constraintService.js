'use strict';

angular.module('singleConceptAuthoringApp')
  .service('constraintService', ['$http', '$rootScope', '$q', 'snowowlService', 'metadataService', 'templateService',
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
            deferred.reject('Attribute not allowed');
          }
        }, function (error) {
          deferred.reject(error.message);
        });
        return deferred.promise;
      }

      function isValueAllowedForType(typeId, targetId, branch, expr) {
        var deferred = $q.defer();

        getConceptsForValueTypeahead(typeId, targetId, branch, expr).then(function (response) {
          console.debug('response', response, response.filter(function (c) {
            return c.id === targetId;
          }),(response.filter(function (c) {
            return c.id === targetId;
          }).length === 0));
          if (response.filter(function (c) {
              return c.id === targetId;
            }).length === 0) {
            console.debug('not allowed');
            deferred.reject();
          } else {
            console.debug('allowed');
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

      function getConceptsForValueTypeaheadHelper(values) {
        var newValues = values ? values : [];

        // remove duplicates and set FD/P status
        for (var i = 0; i < newValues.length; i++) {
          var status = 'FD';
          if (newValues[i].definitionStatus === 'PRIMITIVE') {
            status = 'P';
          }
          if (newValues[i].fsn) {
            newValues[i].tempFsn = newValues[i].fsn.term + ' - ' + status;
            for (var j = newValues.length - 1; j > i; j--) {
              if (newValues[j].id === newValues[i].id) {
                newValues.splice(j, 1);
                j--;
              }
            }
          }
        }
        return newValues;
      }

      function getConceptsForValueTypeahead(attributeId, termFilter, branch, escgExpr) {
        var deferred = $q.defer();

        // if expression specified, perform direct retrieval
        if (escgExpr) {
          snowowlService.searchConcepts(branch, termFilter, escgExpr).then(function (response) {
            var concepts = getConceptsForValueTypeaheadHelper(response);
            deferred.resolve(concepts);
          }, function (error) {
            deferred.reject(error.message);
          });
        }

        // otherwise, use default MRCM rules
        else {
          snowowlService.getAttributeValues(branch, attributeId, termFilter).then(function (response) {
              var concepts = getConceptsForValueTypeaheadHelper(response);
              deferred.resolve(concepts);
            },
            function (error) {
              deferred.reject(error.message);
            });
        }

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
      };
    }

  ])
;
