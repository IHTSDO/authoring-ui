'use strict';
angular.module('singleConceptAuthoringApp.uploadBatch', [])

  .controller('uploadBatchCtrl', ['$scope', '$rootScope', '$location', '$routeParams', 'metadataService', 'templateService', 'snowowlService',
    function uploadBatchCtrl($scope, $rootScope, $location, $routeParams, metadataService, templateService, snowowlService) {
        $scope.uploadFile = function(files) {
                var fd = new FormData();
                //Take the first selected file
                fd.append("file", files[0]);

                $http.post(uploadUrl, fd, {
                    withCredentials: true,
                    headers: {'Content-Type': undefined },
                    transformRequest: angular.identity
                });

            };
    }]);