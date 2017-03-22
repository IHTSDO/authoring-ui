'use strict';
angular.module('singleConceptAuthoringApp.uploadBatch', [])

  .controller('uploadBatchCtrl', ['$scope', '$rootScope', '$location', '$routeParams', 'metadataService', 'templateService', 'snowowlService', 'batchEditingService', '$q', 'notificationService', '$timeout', 'ngTableParams', '$filter',
    function uploadBatchCtrl($scope, $rootScope, $location, $routeParams, metadataService, templateService, snowowlService, batchEditingService, $q, notificationService, $timeout, ngTableParams, $filter) {
         
         $scope.templateOptions = {
            availableTemplates : [],
            selectedTemplate: null
          };
         $scope.templatesLoading = true;
        
         var conceptPromises = [];
    
         $scope.isBatchPopulated = (function(){
             return(batchEditingService.getBatchConcepts() && batchEditingService.getBatchConcepts().length !== 0);
         });
        
         $scope.templateTableParams = new ngTableParams({
            page: 1,
            count: 100,
            sorting: {name: 'asc'}
              },
              {
                filterDelay: 50,
                total: $scope.templateOptions.availableTemplates ? $scope.templateOptions.availableTemplates.length : 0, // length of data
                getData: function ($defer, params) {
                    var searchStr = params.filter().search;
                    var mydata = [];
                    if (!$scope.templateOptions.availableTemplates || $scope.templateOptions.availableTemplates.length === 0) {
                      $defer.resolve([]);
                    } else {
                        if (searchStr) {
                          mydata = $scope.templateOptions.availableTemplates.filter(function (item) {
                            return item.name.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                          });
                        }
                        else {
                          mydata = $scope.templateOptions.availableTemplates;
                        }
                  // TODO support paging and filtering
                  var data = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;
                  $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            });
        
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
            templateService.downloadTemplateCsv(metadataService.getBranchRoot() + '/' + $routeParams.projectKey + '/' + $routeParams.taskKey, template).then(function (data) {
              var fileName = 'batch_' + template;
              $scope.dlcDialog(data.data, fileName);
            });
          }
        if(!metadataService.isTemplatesEnabled()){
            templateService.getTemplates(true).then(function (response) {
                $scope.templates = response;
            });
        }
        else{$scope.templates = null;}
        
        $scope.selectBatchTemplate = function(template){
            $scope.templateOptions.selectedTemplate = template;
            $scope.errorMessage = [];
            $timeout(function(){
                document.getElementById('batchTemplateSelectBtn').click();
            });
        }

        $scope.uploadFile = function(files) {
            console.log(files);
                notificationService.sendMessage('Uploading and generating Batch...', 3000);
                $scope.errorMessage = [];
                var fd = new FormData();
                //Take the first selected file
                fd.append("tsvFile", files[0]);
                templateService.uploadTemplateCsv(metadataService.getBranchRoot() + '/' + $routeParams.projectKey + '/' + $routeParams.taskKey, $scope.templateOptions.selectedTemplate.name, fd).then(function (data) {
                    angular.forEach(data, function (conceptObj) { conceptPromises.push(templateService.createTemplateConcept($scope.templateOptions.selectedTemplate, null, conceptObj));
                    });

                    $q.all(conceptPromises).then(function (concepts) {
                      batchEditingService.addBatchConcepts(concepts);
                      notificationService.sendMessage('Successfully added batch concepts', 3000);
                      $rootScope.$broadcast('batchConcept.change');
                      fd = new FormData();
                      files = [];
                      $location.url('tasks/task/' + $scope.projectKey + '/' + $scope.taskKey + '/batch');
                    }, function (error) {
                      notificationService.sendError('Unexpected error: ' + error);
                    })
                }, function(error) {
                    fd = new FormData();
                    files = [];
                    $scope.errorMessage = error.data.messages;
                    notificationService.sendError('Error with file.');
                });

            };
        
        $scope.$on('batchEditing.refresh', function (event, data) {
            initialize();
          });
        
        function initialize() {
            $scope.templatesLoading = true;
            conceptPromises = [];
            $scope.templateOptions.availableTemplates = [];
            if(!metadataService.isTemplatesEnabled()){
                templateService.getTemplates().then(function (templates) {
                  $scope.templateOptions.availableTemplates = templates;
                    $scope.templatesLoading = false;
                });
            }
            else{$scope.templates = null};
          }
        initialize();
    }]);