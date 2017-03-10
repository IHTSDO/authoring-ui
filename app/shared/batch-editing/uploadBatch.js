'use strict';
angular.module('singleConceptAuthoringApp.uploadBatch', [])

  .controller('uploadBatchCtrl', ['$scope', '$rootScope', '$location', '$routeParams', 'metadataService', 'templateService', 'snowowlService', 'batchEditingService', '$q', 'notificationService', '$timeout', 'ngTableParams', '$filter',
    function uploadBatchCtrl($scope, $rootScope, $location, $routeParams, metadataService, templateService, snowowlService, batchEditingService, $q, notificationService, $timeout, ngTableParams, $filter) {
         
         $scope.templateOptions = {
            availableTemplates : [],
            selectedTemplate: null
          };
        
         var conceptPromises = [];
        
         $scope.isBatchPopulated = batchEditingService.getBatchConcepts() && batchEditingService.getBatchConcepts().length !== 0;
        
         $scope.templateTableParams = new ngTableParams({
            page: 1,
            count: 100,
            sorting: {name: 'asc'}
              },
              {
                filterDelay: 50,
                total: $scope.templates ? $scope.templates.length : 0, // length of data
                getData: function ($defer, params) {
                    var searchStr = params.filter().search;
                    var mydata = [];
                    if (!$scope.templates || $scope.templates.length === 0) {
                      $defer.resolve([]);
                    } else {
                        if (searchStr) {
                          mydata = $scope.items.filter(function (item) {
                            return item.name.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                          });
                        }
                        else {
                          mydata = $scope.templates;
                        }
                  // TODO support paging and filtering
                  var data = params.sorting() ? $filter('orderBy')($scope.templates, params.orderBy()) : $scope.templates;
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
        
        $scope.selectBatchTemplate = function(template){
            $scope.templateOptions.selectedTemplate = template;
            $timeout(function(){
                document.getElementById('batchTemplateSelectBtn').click();
            });
        }

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
                      $location.url('tasks/task/' + $scope.projectKey + '/' + $scope.taskKey + '/batch');
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