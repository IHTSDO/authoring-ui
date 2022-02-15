'use strict';

angular.module('singleConceptAuthoringApp')
  .factory('rnmService', function ($http, $q) {

    var apiEndpoint = null;

    function setEndpoint(url) {
      apiEndpoint = url;
    }
    
    // Retrieve Line Items for a branch
    // GET {branch}
    function getBranchLineItems(branch) {
        return $http.get(apiEndpoint + branch + '/lineitems').then(function (response) {
          return response.data;
        }, function (error) {
        });
    }
    
    // Update Line Item for a branch
    // PUT {branch, lineItem}
    function updateBranchLineItem(branch, lineItem) {
        return $http.put(apiEndpoint + branch + '/lineitems/' + lineItem.id, lineItem).then(function (response) {
          return response.data;
        }, function (error) {
        });
    }
    
    // Create Line Item for a branch
    // POST {branch, lineItem}
    function createBranchLineItem(branch, lineItem) {
        return $http.post(apiEndpoint + branch + '/lineitems/', lineItem).then(function (response) {
          return response.data;
        }, function (error) {
        });
    }
    
    // Retrieve Subjects for a branch
    // GET {branch}
    function getBranchSubjects(branch) {
        return $http.get(apiEndpoint + branch + '/subjects').then(function (response) {
          return response.data;
        }, function (error) {
        });
    }

    //
    // Function exposure
    //
    return {
      setEndpoint: setEndpoint,
      getBranchLineItems: getBranchLineItems,
      getBranchSubjects: getBranchSubjects,
      updateBranchLineItem: updateBranchLineItem,
      createBranchLineItem: createBranchLineItem
    };

  })
;
