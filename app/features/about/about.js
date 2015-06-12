'use strict';

angular.module( 'angularAppTemplateApp.about', [
  //insert dependencies here
    'ngRoute'
])

.config(function config( $routeProvider ) {
  $routeProvider
    .when('/about', {
        controller: 'AboutCtrl',
        templateUrl: 'features/about/about.html'
      });
})

.controller( 'AboutCtrl', function AboutCtrl( $scope ) {
  
});