'use strict';

angular.module('singleConceptAuthoringApp')
  .service('snowowlService', ['$http', '$q', function ($http, $q) {
    var apiEndpoint = '../snowowl/snomed-ct/v2/';

    /////////////////////////////////////
    // Snowowl Concept Retrieval Methods
    /////////////////////////////////////

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
    function getConceptRelationshipsOutbound(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/outbound-relationships').then(function (response) {
        return response.data.outboundRelationships;
      }, function (error) {
        // TODO Handle error
      });
    }

    // Helper call to retrieve a concept with all elements
    function getFullConcept(conceptId, branch) {

      var deferred = $q.defer();

      var concept = {id: conceptId, branch: branch};

      // clunky done flags to handle async behavior
      // TODO Clean this up
      var ptDone = false;
      var descDone = false;
      var relDone = false;
      var propsDone = false;

      getConceptProperties(conceptId, branch).then(function (response) {

        concept.properties = response;

        propsDone = true;
        if (ptDone && descDone && relDone && propsDone) {
          deferred.resolve(concept);
        }
      });

      // get the pt
      getConceptPreferredTerm(conceptId, branch).then(function (response) {
        concept.pt = response;

        ptDone = true;
        if (ptDone && descDone && relDone && propsDone) {
           deferred.resolve(concept);
        }
      });

      // get the descriptions
      getConceptDescriptions(conceptId, branch).then(function (response) {
        concept.descriptions = response;

        descDone = true;
        if (ptDone && descDone && relDone && propsDone) {
          deferred.resolve(concept);
        }
      });

      // get the outbound relationships
      getConceptRelationshipsOutbound(conceptId, branch).then(function (response) {
        concept.outboundRelationships = response;

        relDone = true;
        if (ptDone && descDone && relDone && propsDone) {
          deferred.resolve(concept);
        }
      });


      return deferred.promise;
    }

    return {

      getConceptProperties: getConceptProperties,
      getConceptPreferredTerm: getConceptPreferredTerm,
      getConceptAncestors: getConceptAncestors,
      getConceptDescendants: getConceptDescendants,
      getConceptDescriptions: getConceptDescriptions,
      getConceptRelationshipsInbound: getConceptRelationshipsInbound,
      getConceptRelationshipsOutbound: getConceptRelationshipsOutbound,
      getFullConcept: getFullConcept

    };
  }])
;