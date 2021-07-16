'use strict';

angular.module('singleConceptAuthoringApp')
  .factory('browserService', function ($http, $rootScope, $q) {

      function getBrowserUrl() {
        return $rootScope.endpoints.browserEndpoint;
      }

      function getConceptAcrossMultipleExtensions(conceptId) {
        var deferred = $q.defer();
        $http.get(getBrowserUrl() + 'snowstorm/snomed-ct/multisearch/descriptions?active=true&term=' + conceptId).then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          if (error.status === 404) {
            deferred.resolve(null);
          } else {
            deferred.reject('Error retrieving concept');
          }
        });

        return deferred.promise;
      }

//
// Function exposure
//
      return {
        getConceptAcrossMultipleExtensions: getConceptAcrossMultipleExtensions
      };
    }
  )
;
