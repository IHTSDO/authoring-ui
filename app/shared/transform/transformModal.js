angular.module('singleConceptAuthoringApp.transformModal', [])

  .controller('transformModalCtrl', function ($scope, $modalInstance, results, templateFrom, templateService, metadataService) {

    $scope.results = results;
    $scope.templateFrom = templateFrom;
    $scope.templateTo = '';
    
    if(!metadataService.isTemplatesEnabled()){
        templateService.getTemplates().then(function (response) {
          for(let i = response.length -1; i <= 0; i--){
            console.log(response[i]);
              console.log(response[i].additionalSlots.length);
              if(response[i].additionalSlots.length > 0)
                {
                  response.splice(i, 1);
                }
          }
          $scope.templates = response;
        });
      }

    /////////////////////////////////////////
    // Modal control buttons
    /////////////////////////////////////////
    $scope.getTemplateSuggestions = function (text) {
            return $scope.templates.filter(template => template.name.toLowerCase().indexOf(text.toLowerCase()) > -1);
          };
    
    $scope.promote = function() {
      $modalInstance.close(true);
    };

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };
  });
