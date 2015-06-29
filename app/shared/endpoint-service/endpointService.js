'use strict';

angular.module('singleConceptAuthoringApp')
    .factory('endpointService', ['$http', function ($http) {
        return {
            getEndpoints: function () {
                return $http.get('/config/endpointConfig.json').then(function(response) {
                        return response.data;
                    });
            },
            getProjects: function () {
                return $http.get('/snowowl/ihtsdo-sca/projects').then(function(response) {
                        return response.data;
                    });
            }
        };
    }]);