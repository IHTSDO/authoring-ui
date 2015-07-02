'use strict';

angular.module('singleConceptAuthoringApp')
    .factory('accountService', function ($http) {
        return {
        getAccount: function (endpoint) {
                return $http.get(endpoint, {withCredentials: true}).
                success(function(data, status) {
                	return data;
                  }).
                  error(function(data, status) {
                  });
            },
     };
 });