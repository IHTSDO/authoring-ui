'use strict';

angular.module('singleConceptAuthoringApp')
  .factory('snowowlService', ['$http', function ($http) {
    var apiEndpoint = 'snowowl/snomed-ct/v2/';

    return {

      /////////////////////////////////////
      // Snowowl Concept Retrieval Methods
      /////////////////////////////////////

      // Retrieve Concept properties
      // GET {path}/concepts/{conceptId}
      getConceptProperties: function(conceptId, branch) {
        return $http.get(apiEndpoint + branch + '/concepts/' + conceptId).then(function (response) {
          return response.data;
        }, function(error) {
          // TODO Handle error
        });

      },

      // Retrieve Concept preferred term
      // GET {path}/concepts/{conceptId}
      getConceptPreferredTerm: function(conceptId, branch) {
        return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/pt').then(function (response) {
          return response.data;
        }, function(error) {
          // TODO Handle error
        });

      },

      // Retrieve ancestors of a concept
      // GET /{path}/concepts/{conceptId}/ancestors
      getConceptAncestors: function(conceptId, branch) {
        // TODO Test call
        return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/ancestors').then(function (response) {
          return response.data.ancestors;
        }, function(error) {
          // TODO Handle error
        });

      },

      // Retrieve descendants of a concept
      // GET /{path}/concepts/{conceptId}/descendants
      getConceptDescendants: function(conceptId, branch) {
        return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/descendants').then(function (response) {
          return response.data.descendants;
        }, function(error) {
          // TODO Handle error
        });

      },

      // Retrieve descriptions of a concept
      // GET /{path}/concepts/{conceptId}/descriptions
      getConceptDescriptions: function(conceptId, branch) {
        return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/descriptions').then(function (response) {
          console.debug(response.data);

          // if zero-count, return empty array (no blank array returned)
          if (response.data.total === 0) {
            return [];
          }

          // otherwise, return the passed array
          return response.data.conceptDescriptions;
        }, function(error) {
          // TODO Handle error
        });

      },

      // Retrieve inbound relationships of a concept
      // GET /{path}/concepts/{conceptId}/inbound-relationships
      getConceptRelationshipsInbound: function(conceptId, branch) {
        return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/inbound-relationships').then(function (response) {

          // if zero-count, return empty array (no blank array returned)
          if (response.data.total === 0) {
            return [];
          }

          // otherwise, return the passed array
          return response.data.inboundRelationships;
        }, function(error) {
          // TODO Handle error
        });

      },

      // Retrieve outbound relationships of a concept
      // GET /{path}/concepts/{conceptId}/outbound-relationships
      getConceptRelationshipsOutbound: function(conceptId, branch) {
        return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/outbound-relationships').then(function (response) {
          return response.data.outboundRelationships;
        }, function(error) {
          // TODO Handle error
        });

      }

    };
  }]);