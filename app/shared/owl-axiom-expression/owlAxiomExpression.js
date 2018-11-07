angular.module('singleConceptAuthoringApp.owlAxiomExpressionModal', [])
  .controller('owlAxiomExpressionModalCtrl', function ($scope, $modalInstance, branch, conceptId, conceptFSN, additionalAxioms, gciAxioms, snowowlService, metadataService, notificationService, $window) {   
    
    $scope.conceptFSN = conceptFSN;
    $scope.conceptId = conceptId;
    $scope.branch = branch;
    $scope.additionalAxioms = additionalAxioms;
    $scope.gciAxioms = gciAxioms;
    $scope.owlAxiomExpression = {}; 
    $scope.loading = true;
    var conceptMap = {};

    $scope.formatOwlAxiomExpression = function (owlExpression) {
      var text = owlExpression;
      
      // Add new line char
      text = text.replace(/\(/g, "(\n");
      text = text.replace(/\)/g, "\n)\n"); 
      text = text.replace(/(?<=:\d*)\s/g, "\n");
      text = text.replace(/(?<=:roleGroup)\s/g, "\n");

      let textArr = text.split("\n");
      textArr = textArr.filter(function (el) {
        el = el.trim();
        return el != '';
      });

      // Add tab char
      let tabCount = 0;
      for (let i = 0 ; i < textArr.length; i++) {        
        textArr[i] = textArr[i].trim();
        if (textArr[i].indexOf(')') !== -1) {
          tabCount--;
        }
        if (i !== 0 && tabCount > 0) {
          for (let j = 0 ; j < tabCount; j++) {
            textArr[i] = '\t' + textArr[i];
          }
        }
        if (textArr[i].indexOf('(') !== -1) {
          tabCount++;
        }

        // Fill FSN
        textArr[i] = fillConceptFSN(textArr[i]);       
      }
      return textArr.join('\n');
    };

    function fillConceptFSN (text) {
      var tempStr = text.trim();
      if (tempStr.indexOf(':roleGroup') != -1) {
        return text.replace(':roleGroup', ':609096000 |Role group (attribute)|');
      } else {
        const match = /(^:\d*)/g;
        if (match.test(tempStr)) {
          let conceptId = tempStr.substring(1,tempStr.length);
          if (conceptMap.hasOwnProperty(conceptId)) {
            return text + ' |' + conceptMap[conceptId] + '|';
          } else {
            return text;
          }
        } else {
          return text;
        }
      }
    }

    $scope.copyToClipboard = function (owlExpression) {
      var body = angular.element($window.document.body);
          var textarea = angular.element('<textarea/>');
          textarea.css({
            position: 'fixed',
            opacity: '0'
          });
          textarea.val($scope.formatOwlAxiomExpression(owlExpression));
          body.append(textarea);
          textarea[0].select();

          try {
            var successful = document.execCommand('copy');
            if (!successful) throw successful;
          } catch (err) {
            console.log("failed to copy", toCopy);
          }
          textarea.remove();
    };

    $scope.download = (function () {
      // create the hidden element
      var a = document.createElement('a');
      document.body.appendChild(a);

      return function () {
        var fileName = 'OwlAxiomExpression_' + $scope.conceptId;
        var data = generateFileContent();
        var blob = new Blob([data], {type: 'text/plain;charset=utf-8'});
        var url = window.URL.createObjectURL(blob);        

        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      };
    }());

    function generateFileContent () {
      let result = 'Owl Axiom Expression for ' + $scope.conceptFSN + ' | ' + $scope.conceptId;
      result = result + '\n\n';

      angular.forEach($scope.additionalAxioms, function(additionalAxiom){
        result = result + 'Additional Axiom \n';
        result = result + 'Owl Axiom Expression: ' + $scope.owlAxiomExpression[additionalAxiom.axiomId] + '\n';
        result = result +  $scope.formatOwlAxiomExpression($scope.owlAxiomExpression[additionalAxiom.axiomId]);
        result = result + '\n\n';
      });
      
      angular.forEach($scope.gciAxioms, function(gciAxiom){
        result = result + 'General Concept Inclusion \n';
        result = result + 'Owl Axiom Expression: ' + $scope.owlAxiomExpression[gciAxiom.axiomId] + '\n';
        result = result +  $scope.formatOwlAxiomExpression($scope.owlAxiomExpression[gciAxiom.axiomId]);
        result = result + '\n\n';      
      });

      angular.forEach( $scope.getOtherExpressions(), function(key){
        result = result + 'Owl Axiom Expression \n';
        result = result + 'Owl Axiom Expression: ' + $scope.owlAxiomExpression[key] + '\n';
        result = result +  $scope.formatOwlAxiomExpression($scope.owlAxiomExpression[key]);
        result = result + '\n\n';      
      });
      return result;
    }
   
    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.getOwlAxiomExpressionsCount = function () {
      return Object.keys($scope.owlAxiomExpression).length;
    };

    $scope.getOtherExpressions = function() {
      var others= [];
      var ids = [];
      angular.forEach($scope.additionalAxioms, function(aixom){
        ids.push(aixom.axiomId);
      });
      angular.forEach($scope.gciAxioms, function(aixom){
        ids.push(aixom.axiomId);
      });

      angular.forEach(Object.keys($scope.owlAxiomExpression), function(key){
        if (ids.indexOf(key) === -1) {
          others.push(key);
        }        
      });

      return others;
    };

    function initializeConceptMap (concepts) {
      conceptMap[$scope.conceptId] = $scope.conceptFSN;
      conceptMap[609096000] = 'Role group (attribute)';
      conceptMap[116680003] = 'Is a (attribute)';
      
      if ($scope.additionalAxioms && $scope.additionalAxioms.length !== 0) {
        angular.forEach($scope.additionalAxioms, function(additionalAxiom){
          angular.forEach(additionalAxiom.relationships, function(relationship){
            conceptMap[relationship.type.conceptId] = relationship.type.fsn;
            conceptMap[relationship.target.conceptId] = relationship.target.fsn; 
          });         
        });
      } 
      
      if ($scope.gciAxioms && $scope.gciAxioms.length !== 0) {
        angular.forEach($scope.gciAxioms, function(gciAxiom){
          angular.forEach(gciAxiom.relationships, function(relationship){
            conceptMap[relationship.type.conceptId] = relationship.type.fsn;
            conceptMap[relationship.target.conceptId] = relationship.target.fsn; 
          });         
        });
      }
      
      if (concepts && concepts.length > 0) {
        angular.forEach(concepts, function(concept){
          conceptMap[concept.fsn.conceptId] = concept.fsn.term;
        });
      }
    }

    function getOwlAxiomExpressions () {
      snowowlService.getMembersByReferencedComponent($scope.conceptId, $scope.branch).then(function (response) {
        if (response.total !== 0) {
          angular.forEach(response.items, function (item) {
            if (item.additionalFields 
                && Object.keys(item.additionalFields).length > 0
                && item.additionalFields.hasOwnProperty('owlExpression')) {
              $scope.owlAxiomExpression[item.id] = item.additionalFields['owlExpression'];
            }
          });
        }

        if ($scope.getOwlAxiomExpressionsCount() !== 0) {
          let conceptIds = [];
          for (var key in $scope.owlAxiomExpression) {
            var regex = /(:\d*)/g;
            var found = $scope.owlAxiomExpression[key].match(regex);
            angular.forEach(found, function (item) {
              var conceptId = item.replace(':','').trim();
              if (conceptIds.indexOf(conceptId) === -1) {
                conceptIds.push(conceptId);
              }              
            });                        
          }
          if (conceptIds.length !== 0) {
              snowowlService.bulkGetConcept(conceptIds, $scope.branch).then(function(response) {
                initializeConceptMap(response.items);
                $scope.loading = false;
              });
            } else {
               $scope.loading = false;
            }
        } else {
          $scope.loading = false;
        }        
      });
    }

    function initialize () {
      getOwlAxiomExpressions();      
    }

    initialize();
  });
