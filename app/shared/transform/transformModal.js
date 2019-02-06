angular.module('singleConceptAuthoringApp.transformModal', [])

  .controller('transformModalCtrl', function ($scope, $modalInstance, branch, results, templateFrom, templateService, metadataService, notificationService) {

    $scope.branch = branch;
    $scope.results = results;
    $scope.templateFrom = templateFrom;
    $scope.templateTo = '';
    $scope.errorMsg = '';
    $scope.transformType = 'logical&lexical';
    $scope.logical = true;
    $scope.lexical = true;
    let reasons = metadataService.getDescriptionInactivationReasons();
    $scope.reasons = [];
    angular.forEach(reasons, function(reason){
        if (reason.id !== 'NOT_SEMANTICALLY_EQUIVALENT'){
            $scope.reasons.push(reason);
        }
    });

    $scope.reasons.sort(function (a, b) {
      if (b.id === 'NONCONFORMANCE_TO_EDITORIAL_POLICY') {
        return 1;
      }
      return 0;
    });
    $scope.inactivationReason ={
        'id': 'NONCONFORMANCE_TO_EDITORIAL_POLICY'
    };
    $scope.loading = false;

    if(!metadataService.isTemplatesEnabled()){
        templateService.getTemplates().then(function (response) {
          var list = [];
          var patt1 =  new RegExp("^.*\\((.*)\\)$");
          var patt2 =  new RegExp("^.*\\((.*)\\)");
          var symanticTagOfTemplateFrom1 = patt1.exec($scope.templateFrom.domain.replace(/\|/g,'').trim())[1];
          var symanticTagOfTemplateFrom2 = patt2.exec($scope.templateFrom.name.replace(/\|/g,'').trim())[1];
          var pattSymanticTag1 =  new RegExp("^.*\\(("+ symanticTagOfTemplateFrom1 +")\\)");
          var pattSymanticTag2 =  new RegExp("^.*\\(("+ symanticTagOfTemplateFrom2 +")\\)");
          for(let i = response.length -1; i >= 0; i--){
            if(response[i].additionalSlots.length === 0
              && (pattSymanticTag1.test(response[i].name) 
                || pattSymanticTag2.test(response[i].name)
                || pattSymanticTag1.test(response[i].domain)
                || pattSymanticTag2.test(response[i].domain))) {
              list.push(response[i]);
            }
          }

          $scope.templates = list;
        });
      }

    /////////////////////////////////////////
    // Modal control buttons
    /////////////////////////////////////////
    $scope.getTemplateSuggestions = function (text) {
      return $scope.templates.filter(template => template.name.toLowerCase().indexOf(text.toLowerCase()) > -1);
    };

    $scope.updateAssociations = function (inactivationReason) {
      $scope.inactivationReason = inactivationReason;
    };

    $scope.selectTemplate = function() {
      $scope.errorMsg = '';
    };

    $scope.transform = function() {
      if($scope.transformType === 'logical&lexical'){
          $scope.logical = true;
          $scope.lexical = true;
      }
      else if($scope.transformType === 'logical'){
          $scope.logical = true;
          $scope.lexical = false;
      }
      else{
          $scope.lexical = true;
          $scope.logical = false;
      }
      $scope.loading = true;
      $scope.errorMsg = '';
      templateService.transform($scope.branch, $scope.templateFrom, $scope.templateTo, $scope.inactivationReason.id, $scope.results, $scope.logical, $scope.lexical).then(function(response){
          $scope.loading = false;
          $modalInstance.close(response);
      }, function (error) {
          $scope.loading = false;
          $scope.errorMsg = error;
      });
    };

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };
  });
