'use strict';

angular.module('singleConceptAuthoringApp')
    .factory('accountService', function ($http, $rootScope) {
        return {
        getAccount: function (imsUrl) {
                return $http.get(imsUrl + 'api/account', {withCredentials: true}).
                success(function(data, status) {
                	return data;
                  }).
                  error(function(data, status) {
                    return status;
                  });
            },
     };
 });