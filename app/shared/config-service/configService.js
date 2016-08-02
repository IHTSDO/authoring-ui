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
          //deferred.resolve(validationProperties.excludedRuleIds);
          deferred.resolve([
            '31f5e2c8-b0b9-42ee-a9bf-87d95edad83b',
            '2ddc9a28-150d-47a4-9b0e-7dbff2efdd72',
            'd76f1430-7e9a-11e1-b0c4-0800200c9a66',
            'd5c80582-ad32-4f26-a729-a91fe04a06b2'
          ])
        }, function(error) {
          // deferred.reject(error);
          deferred.resolve([
            '31f5e2c8-b0b9-42ee-a9bf-87d95edad83b',
            '2ddc9a28-150d-47a4-9b0e-7dbff2efdd72',
            'd76f1430-7e9a-11e1-b0c4-0800200c9a66',
            'd5c80582-ad32-4f26-a729-a91fe04a06b2'
          ])
        });
        return deferred.promise;
      },

      getWhiteListEligibleRuleIds : function() {
        var deferred = $q.defer();
        getConfigProperties().then(function(properties, validationProperties) {
         // deferred.resolve(validationProperties.whitelistEligibleIds);
          deferred.resolve( [
            'cc9c5340-84f0-11e1-b0c4-0800200c9a66',
            'c3249e80-84f0-11e1-b0c4-0800200c9a66'
          ])
        }, function(error) {
          deferred.resolve( [
            'cc9c5340-84f0-11e1-b0c4-0800200c9a66',
            'c3249e80-84f0-11e1-b0c4-0800200c9a66'
          ])
          // deferred.reject(error);
        });
        return deferred.promise;
      }
    };
  }]);
