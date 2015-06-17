'use strict';

angular.module( 'angularAppTemplateApp.home', [
  //insert dependencies here
    'ngRoute'
])

.config(function config( $routeProvider ) {
  $routeProvider
    .when('/home', {
        controller: 'HomeCtrl',
        templateUrl: 'components/home/home.html'
      });
})

.controller( 'HomeCtrl', function AboutCtrl( $scope ) {
    
});