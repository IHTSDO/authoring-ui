'use strict';

angular.module('singleConceptAuthoringApp')
  .factory('configService', ['$http', function ($http, $q) {
    return {
      getEndpoints: function () {

        return $http.get('/config/endpointConfig.json').then(function (response) {
          return response.data;
        }, function(error) {
          return {};
        });

      },
      getExcludedValidationRuleIds : function() {
        return $http.get('/config/endpointConfig.json').then(function(response) {
          return response.data.excludedRuleIds;
        }, function(error) {
          return [];
        })
      },
      getWhiteListEligibleRuleIds : function() {
        return $http.get('/config/endpointConfig.json').then(function(response) {
          return response.data.whitelistEligibleIds;
        }, function(error) {
          return [];
        })
      }
    };
  }]);