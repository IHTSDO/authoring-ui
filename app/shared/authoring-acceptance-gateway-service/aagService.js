'use strict';

angular.module('singleConceptAuthoringApp')
  .factory('aagService', function ($http, $q) {

    var apiEndpoint = null;

    function setEndpoint(url) {
      apiEndpoint = url;
    }

    function getAllWhitelistItems() {
      var deferred = $q.defer();      
      $http.get(apiEndpoint + 'whitelist-items?page=0&size=10000').then(function (response) {
        deferred.resolve(response.data.content);
      }, function (error) {
        if (error.status === 404) {
          deferred.resolve([]);
        } else {
          deferred.reject('Error retrieving all whitelist items. Error: ' + error.message);
        }
      });
      return deferred.promise;
    }

    function addToWhitelist(whitelistItem) {
      var deferred = $q.defer();      
      $http.post(apiEndpoint + 'whitelist-items', whitelistItem).then(function (data) {
        deferred.resolve(data);
      }, function (error) {       
          deferred.reject('Error adding item to whitelist. Error: ' + error.message);       
      });
      return deferred.promise;
    }

    function removeFromWhitelist(id) {
      var deferred = $q.defer();      
      $http.delete(apiEndpoint + 'whitelist-items/' + id).then(function () {
        deferred.resolve();
      }, function (error) {       
          deferred.reject('Error deleting item from whitelist. Error: ' + error.message);       
      });
      return deferred.promise;
    }

//
// Function exposure
//
    return {
      setEndpoint: setEndpoint,
      getAllWhitelistItems: getAllWhitelistItems,
      addToWhitelist: addToWhitelist,
      removeFromWhitelist: removeFromWhitelist
    };

  })
;
