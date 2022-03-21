angular.module('singleConceptAuthoringApp.descriptorRefsetModal', [])
  .controller('descriptorRefsetModalCtrl', function ($scope, $modalInstance, ngTableParams, $filter, terminologyServerService, branch, conceptId, conceptFSN) {

    $scope.conceptFSN = conceptFSN;
    $scope.conceptId = conceptId;
    $scope.branch = branch;
    $scope.loading = true;
    $scope.members = [];

    $scope.descriptorRefsetMemberTableParams = new ngTableParams({
      page: 1,
      count: 10
    },
    {
      filterDelay: 50,
      total: $scope.members ? $scope.members.length : 0,
      getData: function ($defer, params) {
        if (!$scope.members || $scope.members.length === 0) {
          $defer.resolve([]);
        } else {
          var mydata = [];
          mydata = $scope.members;
          params.total(mydata.length);
          mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;
          $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
      }
    });

    function getDescriptorRefsetMembers() {
      terminologyServerService.getMembersByRefsetAndReferencedComponent('900000000000456007', $scope.conceptId, $scope.branch, true).then(function(response) {
        if (response && response.length !== 0) {
          $scope.members = response;
          let ids = [];
          angular.forEach($scope.members, function(item) {
            if (ids.indexOf(item.additionalFields.attributeDescription) === -1) {
              ids.push(item.additionalFields.attributeDescription);
            }

            if (ids.indexOf(item.additionalFields.attributeType) === -1) {
              ids.push(item.additionalFields.attributeType);
            }
          });

          terminologyServerService.bulkGetConceptUsingPOST(ids, $scope.branch).then(function(response) {
            let conceptMap = {};
            angular.forEach(response.items, function(item) {
              conceptMap[item.conceptId] = item.fsn;
            });

            angular.forEach($scope.members, function(item) {
              if (conceptMap.hasOwnProperty(item.additionalFields.attributeDescription)) {
                item.additionalFields.attributeDescriptionFsn = conceptMap[item.additionalFields.attributeDescription];
              } else {
                item.additionalFields.attributeDescriptionFsn = {term : item.additionalFields.attributeDescription};
              }
              if (conceptMap.hasOwnProperty(item.additionalFields.attributeType)) {
                item.additionalFields.attributeTypeFsn = conceptMap[item.additionalFields.attributeType];
              } else {
                item.additionalFields.attributeTypeFsn = {term : item.additionalFields.attributeType};
              }
            });
            $scope.descriptorRefsetMemberTableParams.reload();
            $scope.loading = false;
          });
        } else {
          $scope.descriptorRefsetMemberTableParams.reload();
          $scope.loading = false;
        }
      });
    }

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    function initialize () {
      getDescriptorRefsetMembers();
    }

    initialize();
  });
