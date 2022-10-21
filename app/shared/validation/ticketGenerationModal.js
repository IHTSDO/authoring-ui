'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .controller('ticketGenerationModalCtrl', function ($scope, $modal, $modalInstance, $filter, modalService, scaService, notificationService, ngTableParams, branch, reportRunId, failedAssertions) {

    $scope.branch = branch;
    $scope.reportRunId = reportRunId;
    $scope.failedAssertions = failedAssertions;
    $scope.loadingFailureTicketAssocication = false;

    $scope.failedAssertionsTableParams = new ngTableParams({
        page: 1,
        count: 10
      },
      {
        total: $scope.failedAssertions ? $scope.failedAssertions.length : 0,
        getData: function ($defer, params) {
          if (!$scope.failedAssertions) {
            $defer.resolve([]);
          } else {
            params.total($scope.failedAssertions.length);
            let assertionsDisplayed = params.sorting() ? $filter('orderBy')($scope.failedAssertions, params.orderBy()) : $scope.failedAssertions;
            $defer.resolve(assertionsDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        }
      }
    );

    $scope.selectAll = function (selectAll) {
      angular.forEach($scope.failedAssertions, function (failure) {
        failure.selected = selectAll;
      });
    };

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.generateTickets = function() {
      let assertionIds = []
      angular.forEach($scope.failedAssertions, function (failure) {
        if (failure.selected && !failure.jiraUrl) {
          assertionIds.push(failure.assertionUuid);
        }
      });
      if (assertionIds.length !== 0) {
        modalService.confirm('Do you really want to generate JIRA tickets for the selected failures?').then(function () {
          var generatingTicketModalInstance = $modal.open({
            templateUrl: 'shared/validation/ticketGeneratingModal.html',
            backdrop: 'static',
            size: 'xxsmall'
          });
          scaService.raiseRVFJiraTickets($scope.branch, $scope.reportRunId, assertionIds).then(function(response) {
              generatingTicketModalInstance.close();
              scaService.getRVFFailureTicketAssociations($scope.reportRunId).then(function(response) {
                for(let i = 0; i < response.length; i++) {
                  angular.forEach($scope.failedAssertions, function (failure) {
                    if (failure.assertionUuid === response[i].assertionId) {
                      failure.jiraUrl = response[i].jiraUrl;
                    }
                  });
                }
              });

              $modal.open({
                templateUrl: 'shared/validation/ticketGenerationSummaryModal.html',
                controller: 'ticketGenerationSummaryModalCtrl',
                size: 'medium',
                resolve: {
                  data: function () {
                    return response.data;
                  }
                }
              });
            }, function (error) {
              generatingTicketModalInstance.close();
              modalService.message('Error', error);
            }
          );
        });
      } else {
        modalService.message('No selected failures.');
      }
    }

    ////////////////////////////////////
    // Initialization
    ////////////////////////////////////
    function initialize() {
      $scope.loadingFailureTicketAssocication = true;
      scaService.getRVFFailureTicketAssociations($scope.reportRunId).then(function(response) {
        for(let i = 0; i < response.length; i++) {
          angular.forEach($scope.failedAssertions, function (failure) {
            if (failure.assertionUuid === response[i].assertionId) {
              failure.jiraUrl = response[i].jiraUrl;
            }
          });
        }
        $scope.loadingFailureTicketAssocication = false;
      });

    }

    initialize();
  })
;
