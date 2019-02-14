'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles all functionality surrounding CRS tickets
 */
  .factory('cisService', function ($http, $rootScope, $q, scaService, metadataService, snowowlService, $timeout, notificationService) {

      var currentTask;

      var currentTaskConcepts = null;

      //
      // TODO Move this into endpoint config
      //
      function getCisUrl() {       
        return $rootScope.endpoints.cisEndpoint;
      }      

      function getAllNamespaces() {
        var deferred = $q.defer();
        $http.get(getCisUrl() + '/namespaces').then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          if (error.status === 404) {
            deferred.resolve([]);
          } else {
            deferred.reject('Error retrieving namespaces');
          }
        });

        return deferred.promise;
      }
     
//
// Function exposure
//
      return {
        getAllNamespaces: getAllNamespaces
      };
    }
  )
;
