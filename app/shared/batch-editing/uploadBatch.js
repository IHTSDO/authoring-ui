'use strict';
angular.module('singleConceptAuthoringApp.uploadBatch', [])

  .controller('uploadBatchCtrl', ['$scope', '$rootScope', '$location', '$routeParams', 'metadataService', 'templateService', 'snowowlService', 'batchEditingService',
    function uploadBatchCtrl($scope, $rootScope, $location, $routeParams, metadataService, templateService, snowowlService, batchEditingService) {
         
         $scope.templateOptions = {
            availableTemplates : [],
            selectedTemplate: null
          };
         $scope.dlcDialog = (function (data, fileName) {
            var a = document.createElement('a');
            document.body.appendChild(a);
            return function (data, fileName) {
              var
                blob = new Blob([data], {type: 'text/tab-separated-values'}),
                url = window.URL.createObjectURL(blob);
              a.href = url;
              a.download = fileName;
              a.click();
              window.URL.revokeObjectURL(url);
            };
          }());

          $scope.downloadTemplate = function(template){
            templateService.downloadTemplateCsv($scope.branch, template).then(function (data) {
              var fileName = 'batch_' + template;
              $scope.dlcDialog(data.data, fileName);
            });
          }
        
        templateService.getTemplates().then(function (response) {
            $scope.templates = response;
        });

        $scope.uploadFile = function(files) {
                var fd = new FormData();
                //Take the first selected file
                fd.append("tsvFile", files[0]);
                templateService.uploadTemplateCsv('MAIN', $scope.templateOptions.selectedTemplate.name, fd).then(function (data) {
                    console.log(data);
                });

            };
        
        function initialize() {

            templateService.getTemplates().then(function (templates) {
              $scope.templateOptions.availableTemplates = templates;
            });

            batchEditingService.initializeFromScope($scope).then(function () {

              $scope.templateOptions.selectedTemplate = batchEditingService.getCurrentTemplate();

            })
          }
        initialize();
    }]);