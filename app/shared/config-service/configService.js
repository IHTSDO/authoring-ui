'use strict';

angular.module('singleConceptAuthoringApp')
  .factory('configService', ['$http', '$q', function ($http, $q) {

    var properties = null;
    var validationProperties = null;

    function getConfigProperties() {
      var deferred = $q.defer();
      if (!properties) {
        $http.get('/config/endpointConfig.json').then(function (response) {
          properties = response.data;
          $http.get('/sca/validationConfig/validationConfig.json').then(function (validationResponse) {
              validationProperties = validationResponse.data;
              deferred.resolve(properties, validationProperties);
            }, function(error) {
              deferred.reject('Failed to retrieve validation configuration properties');
            });
          
        }, function(error) {
          deferred.reject('Failed to retrieve configuration properties');
        });
      } else {
        deferred.resolve(properties, validationProperties);
      }
      return deferred.promise;
    }

    return {
      getEndpoints: function () {
        var deferred = $q.defer();
        getConfigProperties().then(function(properties, validationProperties) {
          deferred.resolve(properties.endpoints);
        }, function(error) {
          deferred.reject(error);
        });
        return deferred.promise;
      },
        
      getExcludedValidationRuleIds : function() {
        var deferred = $q.defer();
        getConfigProperties().then(function(properties, validationProperties) {
          deferred.resolve(validationProperties.excludedRuleIds);
        }, function(error) {
          deferred.reject(error);
        });
        return deferred.promise;
      },
        
      getWhiteListEligibleRuleIds : function() {
        var deferred = $q.defer();
        getConfigProperties().then(function(properties, validationProperties) {
          deferred.resolve(validationProperties.whitelistEligibleIds);
        }, function(error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }
    };
  }]);
