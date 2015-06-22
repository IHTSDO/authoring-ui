'use strict';

angular.module('angularAppTemplateApp')
    .factory('endpointService', ['$http', function ($http) {
        return {
            getEndpoints: function () {
                return $http.get('endpointConfig.json').then(function(response) {
                        return response.data;
                    });
            }
        };
    }]);