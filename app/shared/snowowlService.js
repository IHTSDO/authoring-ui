'use strict';

angular.module('angularAppTemplateApp')
    .factory('snowowlService', ['$http', function ($http) {
        var apiEndpoint = '/snowowl/snomed-ct/MAIN/';

        return {
            getConceptName: function (conceptId) {
                return $http.get(apiEndpoint +'concepts/' + conceptId).then(function(response) {
                        return response;
                    });
            }
        };
    }]);