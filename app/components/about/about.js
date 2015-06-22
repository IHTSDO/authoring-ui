'use strict';

angular.module( 'angularAppTemplateApp.about', [
  //insert dependencies here
    'ngRoute'
])

.config(function config( $routeProvider ) {
  $routeProvider
    .when('/about', {
        controller: 'AboutCtrl',
        templateUrl: 'components/about/about.html'
      });
})

.controller( 'AboutCtrl', function AboutCtrl( $scope, $rootScope) {
});