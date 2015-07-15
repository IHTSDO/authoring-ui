'use strict';

angular.module('singleConceptAuthoringApp')
  .service('snowowlService', ['$http', '$q', function ($http, $q, $watch) {
    var apiEndpoint = '../snowowl/snomed-ct/v2/';

    /////////////////////////////////////
    // Snowowl Concept Retrieval Methods
    /////////////////////////////////////

    // Create New Concept
    // POST /browser/{path}/concepts
    function createConcept(project, task, concept) {
      return $http.post(apiEndpoint + 'browser/MAIN/' + project + '/' + task + '/concepts/', concept).then(function (response) {
        return response.data;
      }, function (error) {
        // TODO Handle error
      });

    }

    // Update Existing Concept
    // PUT /browser/{path}/concepts/{conceptId}
    function updateConcept(project, task, concept) {
      return $http.put(apiEndpoint + 'browser/MAIN/' + project + '/' + task + '/concepts/' + concept.conceptId, concept).then(function (response) {
        return response.data;
      }, function (error) {
        // TODO Handle error
      });

    }

    // Retrieve Concept properties
    // GET {path}/concepts/{conceptId}
    function getConceptProperties(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId).then(function (response) {
        return response.data;
      }, function (error) {
        // TODO Handle error
      });

    }

    // Retrieve Concept preferred term
    // GET {path}/concepts/{conceptId}
    function getConceptPreferredTerm(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/pt').then(function (response) {
        return response.data;
      }, function (error) {
        // TODO Handle error
      });

    }

    // Retrieve ancestors of a concept
    // GET /{path}/concepts/{conceptId}/ancestors
    function getConceptAncestors(conceptId, branch) {
      // TODO Test call
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/ancestors').then(function (response) {
        return response.data.ancestors;
      }, function (error) {
        // TODO Handle error
      });
    }

    // Retrieve descendants of a concept
    // GET /{path}/concepts/{conceptId}/descendants
    function getConceptDescendants(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/descendants').then(function (response) {
        return response.data.descendants;
      }, function (error) {
        // TODO Handle error
      });

    }

    // Retrieve descriptions of a concept
    // GET /{path}/concepts/{conceptId}/descriptions
    function getConceptDescriptions(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/descriptions').then(function (response) {

        // if zero-count, return empty array (no blank array returned)
        if (response.data.total === 0) {
          return [];
        }

        // otherwise, return the passed array
        return response.data.conceptDescriptions;
      }, function (error) {
        // TODO Handle error
      });
    }

    // Retrieve inbound relationships of a concept
    // GET /{path}/concepts/{conceptId}/inbound-relationships
    function getConceptRelationshipsInbound(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/inbound-relationships').then(function (response) {

        // if zero-count, return empty array (no blank array returned)
        if (response.data.total === 0) {
          return [];
        }

        // otherwise, return the passed array
        return response.data.inboundRelationships;
      }, function (error) {
        // TODO Handle error
      });
    }

    // Retrieve outbound relationships of a concept
    // GET /{path}/concepts/{conceptId}/outbound-relationships
    // UNUSED
    function getConceptRelationshipsOutbound(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/outbound-relationships').then(function (response) {
        return response.data.outboundRelationships;
      }, function (error) {
        // TODO Handle error
      });
    }

    // helper call to populate relationship display names
    function getRelationshipDisplayNames(relationship, branch) {
      var deferred = $q.defer();

      var targetDone = false;
      var typeDone = false;

      // get the target

      getConceptPreferredTerm(relationship.target.conceptId, branch).then(function (response) {
        if (response && response.term) {
          relationship.target.fsn = response.term;
        }
        targetDone = true;
        if (typeDone) {
          deferred.resolve(relationship);
        }
      });

      getConceptPreferredTerm(relationship.type.conceptId, branch).then(function (response) {
        if (response && response.term) {
          relationship.type.fsn = response.term;
        }
        typeDone = true;
        if (targetDone) {
          deferred.resolve(relationship);
        }
      });

      return deferred.promise;

    }

    // Helper call to retrieve a concept with all elements
    // Puts all elements in save-ready format
    function getFullConcept(conceptId, branch) {

      var deferred = $q.defer();

      var concept = {};

      // clunky done flags to handle async behavior
      // TODO Clean this up
      var ptDone = false;
      var descDone = false;
      var relDone = false;
      var propsDone = false;

      getConceptProperties(conceptId, branch).then(function (response) {

        if (!response) {
          deferred.reject('Could not retrieve properties');
        } else {

          // copy properties onto concept object
          concept.active = response.active;
          concept.definitionStatus = response.definitionStatus;
          concept.effectiveTime = response.effectiveTime;
          concept.conceptId = response.id;
          concept.moduleId = response.moduleId;
          concept.released = response.released;
          concept.subclassDefinitionStatus = response.subclassDefinitionStatus;

          propsDone = true;
          if (ptDone && descDone && relDone && propsDone) {
            deferred.resolve(concept);
          }
        }
      });

      // get the pt
      getConceptPreferredTerm(conceptId, branch).then(function (response) {

        if (!response) {
          deferred.reject('Could not retrieve preferred term');
        } else {
          concept.fsn = response.term;

          ptDone = true;
          if (ptDone && descDone && relDone && propsDone) {
            deferred.resolve(concept);
          }
        }
      });

      // get the descriptions
      getConceptDescriptions(conceptId, branch).then(function (response) {
        if (!response) {
          deferred.reject('Could not retrieve descriptions');
        } else {

          concept.descriptions = [];

          for (var i = 0; i < response.length; i++) {
            var desc = response[i];

            var type = null;
            switch (desc.typeId) {
              case '900000000000003001':
                type = 'FSN';
                break;
              case '900000000000013009':
                type = 'SYNONYM';
                break;
              case '900000000000550004':
                type = 'TEXT_DEFINITION';
                break;
            }

            var newDesc = {
              'effectiveTime': desc.effectiveTime,
              'moduleId': desc.moduleId,
              'term': desc.term,
              'active': desc.active,
              'type': type,
              'lang': desc.languageCode,
              'caseSignificance': desc.caseSignificance,
              'acceptabilityMap': desc.acceptabilityMap
            }

            concept.descriptions.push(newDesc);
          }

          descDone = true;
          if (ptDone && descDone && relDone && propsDone) {
            deferred.resolve(concept);
          }
        }
      });

      // get the outbound relationships with their names -- SO HACKISH
      getConceptRelationshipsOutbound(conceptId, branch).then(function (response) {

        if (!response) {
          deferred.reject('Could not retrieve relationships');
        } else {

          concept.relationships = [];

          // parse the relationships
          for (var i = 0; i < response.length; i++) {
            var rel = response[i];

            // convert relationship to required format
            var newRel = {
              'effectiveTime': rel.effectiveTime,
              'modifier': rel.modifier,
              'groupId': rel.group,
              'moduleId': rel.moduleId,
              'target': {
                'conceptId': rel.destinationId
              },
              'active': rel.active,
              'characteristicType': rel.characteristicType,
              'type': {
                'conceptId': rel.typeId
              }
            }

            getRelationshipDisplayNames(newRel, branch).then(function (relationship) {
              concept.relationships.push(relationship);

              if (concept.relationships.length === response.length) {
                relDone = true;
                if (ptDone && descDone && relDone && propsDone) {
                  deferred.resolve(concept);
                }
              }
            });
          }
        }
      });

      return deferred.promise;
    };

    return {

      getConceptProperties: getConceptProperties,
      getConceptPreferredTerm: getConceptPreferredTerm,
      updateConcept: updateConcept,
      createConcept: createConcept,
      getConceptAncestors: getConceptAncestors,
      getConceptDescendants: getConceptDescendants,
      getConceptDescriptions: getConceptDescriptions,
      getConceptRelationshipsInbound: getConceptRelationshipsInbound,
      getConceptRelationshipsOutbound: getConceptRelationshipsOutbound,
      getRelationshipDisplayNames: getRelationshipDisplayNames,
      getFullConcept: getFullConcept

    };
  }

  ])
;