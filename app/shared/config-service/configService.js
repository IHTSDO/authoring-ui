'use strict';

angular.module('singleConceptAuthoringApp')
  .factory('configService', ['$http', '$q', function ($http, $q) {

    var properties = null;

    function getConfigProperties() {
      var deferred = $q.defer();
      if (!properties) {
        $http.get('/config/endpointConfig.json').then(function (response) {
          properties = response.data;
          deferred.resolve(properties);
        }, function(error) {
          deferred.reject('Failed to retrieve configuration properties');
        });
      } else {
        deferred.resolve(properties);
      }
      return deferred.promise;
    }

    return {
      getEndpoints: function () {
        var deferred = $q.defer();
        getConfigProperties().then(function(properties) {
          deferred.resolve(properties.endpoints);
        }, function(error) {
          deferred.reject(error);
        });
        return deferred.promise;
      },
      getExcludedValidationRuleIds : function() {
        var deferred = $q.defer();
        getConfigProperties().then(function(properties) {
          deferred.resolve(properties.excludedRuleIds);
        }, function(error) {
          deferred.reject(error);
        });
        return deferred.promise;
      },
      getWhiteListEligibleRuleIds : function() {
        var deferred = $q.defer();
        getConfigProperties().then(function(properties) {
          deferred.resolve(properties.whitelistEligibleIds);
        }, function(error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }
    };
  }]);
