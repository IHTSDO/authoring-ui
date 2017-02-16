'use strict';
angular.module('singleConceptAuthoringApp.uploadBatch', [])

  .controller('uploadBatchCtrl', ['$scope', '$rootScope', '$location', '$routeParams', 'metadataService', 'templateService', 'snowowlService', 'batchEditingService', '$q', 'notificationService',
    function uploadBatchCtrl($scope, $rootScope, $location, $routeParams, metadataService, templateService, snowowlService, batchEditingService, $q, notificationService) {
         
         $scope.templateOptions = {
            availableTemplates : [],
            selectedTemplate: null
          };
        
         var conceptPromises = [];
        
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
        if(!metadataService.isTemplatesEnabled()){
            templateService.getTemplates().then(function (response) {
                $scope.templates = response;
            });
        }
        else{$scope.templates = null;}

        $scope.uploadFile = function(files) {
                notificationService.sendMessage('Uploading and generating Batch...', 3000);
                var fd = new FormData();
                //Take the first selected file
                fd.append("tsvFile", files[0]);
                templateService.uploadTemplateCsv('MAIN', $scope.templateOptions.selectedTemplate.name, fd).then(function (data) {
                    angular.forEach(data, function (conceptObj) { conceptPromises.push(templateService.createTemplateConcept($scope.templateOptions.selectedTemplate, null, conceptObj));
                    });

                    $q.all(conceptPromises).then(function (concepts) {
                      batchEditingService.addBatchConcepts(concepts);
                      notificationService.sendMessage('Successfully added batch concepts', 3000);
                      $rootScope.$broadcast('batchConcept.change');
                    }, function (error) {
                      notificationService.sendError('Unexpected error: ' + error);
                    })
                }, function(error) {
                    $scope.errorMessage = error.data.messages;
                    notificationService.sendError('Error with file.');
                });

            };
        
        function initialize() {
            if(!metadataService.isTemplatesEnabled()){
                templateService.getTemplates().then(function (templates) {
                  $scope.templateOptions.availableTemplates = templates;
                });
            }
            else{$scope.templates = null};

            batchEditingService.initializeFromScope($scope).then(function () {

              $scope.templateOptions.selectedTemplate = batchEditingService.getCurrentTemplate();

            })
          }
        initialize();
    }]);