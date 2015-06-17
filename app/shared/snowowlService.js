'use strict';

angular.module('templateBasedAuthoring')
    .factory('snowowlService', ['$http', function ($http) {
        var apiEndpoint = '/snowowl/snomed-ct/MAIN/';

        return {
            getConceptName: function (conceptId) {
                console.log('service call');
                return $http.get(apiEndpoint +'concepts/' + conceptId).then(function(response) {
                        return response;
                    });
            }
        };
    }]);