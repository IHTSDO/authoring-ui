'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('crsPendingClarificatioModalCtrl', function ($scope, $modalInstance, crsService, ngTableParams, notificationService) {
    
    $scope.getCrsRequest = crsService.getCrsRequest;
    $scope.crsRequestsStatus = angular.copy(crsService.getCrsRequestsStatus());
    $scope.message = "";

    const requestStatus = {
      "draft": "Draft",
      "new": "New",
      "accepted": "Accepted",
      "rejected": "Rejected",
      "clarificationNeeded": "Pending Clarification",
      "appeal": "In Appeal",
      "appealRejected": "Appeal Rejected",
      "withdraw": "Withdrawn",
      "underAuthoring": "Under Authoring",
      "released": "Completed",
      "onHold": "On Hold",
      "forwarded": "Forwarded",
      "approved": "Approved",
      "inInceptionElaboration": "In Inception/Elaboration",
      "readyForRelease": "Ready For Release",
      "submitted": "Submitted",
      "inAppealClarification": "In Appeal Clarification",
      "waitingForInternalInput": "Pending Internal Input"
    };
    
    // declare table parameters
    $scope.pendingClarificationTableParams = new ngTableParams({
        orderBy: 'crsId',
        count: $scope.crsRequestsStatus.length.length
      },
      {
        counts: [],
        getData: function ($defer, params) {          
          $defer.resolve($scope.crsRequestsStatus);
        }      
      }
    );

    $scope.getStatusText = function (code) {
      if(!code) {
        return '';
      }
      var text = code.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      text = text.charAt(0).toLowerCase() + text.slice(1);
      text = text.replace(/\s/g, '');
      return requestStatus[text];
    };

    $scope.getSelectedItems = function () {
      let selectedRequests = $scope.crsRequestsStatus.filter(request => request.selected);
      if (selectedRequests.length == 0) {
        return [];
      } else {
        let result = [];
        angular.forEach(selectedRequests, function(item){
          result.push(item.crsId);
        });
        return result;
      }
    };

    $scope.selectAll = function(flag) {
       angular.forEach($scope.crsRequestsStatus, function(item){
        if (item.status !== 'CLARIFICATION_NEEDED') {
          item.selected = flag;
        }
      });
    };  
   
    /////////////////////////////////////////
    // Modal control buttons
    /////////////////////////////////////////
    $scope.requestClarification = function () {
      let list = $scope.getSelectedItems();
      notificationService.sendMessage('Updating CRS request status to Pending Clarification...');
      crsService.requestClarification(list);  
      $modalInstance.close();    
    };   

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };
  });
