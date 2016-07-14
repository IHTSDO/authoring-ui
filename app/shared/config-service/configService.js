'use strict';

angular.module('singleConceptAuthoringApp')
  .factory('configService', ['$http', function ($http) {
    return {
      getEndpoints: function () {
        return $http.get('/config/endpointConfig.json').then(function (response) {
          return response.data;
        });
      },
      getExcludedValidationRuleIds : function() {
        return $http.get('/validationConfig/validationConfig.json').then(function(response) {
          return response.data.excludedRuleIds;
        })
      },
      getWhiteListEligibleRuleIds : function() {
        return $http.get('/validationConfig/validationConfig.json').then(function(response) {
          return response.data.whitelistEligibleIds;
        })
      }
    };
  }]);