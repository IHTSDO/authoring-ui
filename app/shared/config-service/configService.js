'use strict';

angular.module('singleConceptAuthoringApp')
  .factory('configService', ['$http', '$q', function ($http, $q) {

    var properties = {};
    properties.endpoints = null;
    properties.validationProperties = null;

    function getConfigProperties() {
      var deferred = $q.defer();
      if (!properties.endpoints) {
        $http.get('/config/endpointConfig.json').then(function (response) {
          properties.endpoints = response.data;
          $http.get('/sca/validationConfig/validationConfig.json').then(function (validationResponse) {
              properties.validationProperties = validationResponse.data;
              console.log(properties);
              deferred.resolve(properties);
            }, function(error) {
              deferred.reject('Failed to retrieve validation configuration properties');
            });
          
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
          deferred.resolve(properties.endpoints.endpoints);
        }, function(error) {
          deferred.reject(error);
        });
        return deferred.promise;
      },
        
      getExcludedValidationRuleIds : function() {
        var deferred = $q.defer();
        getConfigProperties().then(function(properties) {
          deferred.resolve(properties.validationProperties.excludedRuleIds);
        }, function(error) {
          deferred.reject(error);
        });
        return deferred.promise;
      },
        
      getWhiteListEligibleRuleIds : function() {
        var deferred = $q.defer();
        getConfigProperties().then(function(properties) {
          deferred.resolve(properties.validationProperties.whitelistEligibleIds);
        }, function(error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }
    };
  }]);
