'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('lineItemCtrl', function ($scope, $modalInstance, aagService, branch) {

    // scope variables
    $scope.branch = branch;
    $scope.text = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut ornare felis mollis, porttitor erat commodo, congue magna. Nam quis facilisis sapien, sit amet luctus mauris. Ut eleifend facilisis mi vitae facilisis. Curabitur facilisis placerat vulputate. Aenean mollis nulla neque, id fringilla nulla ornare sodales. Nulla facilisi. Nulla nec auctor risus.</p><p>Curabitur porta maximus augue eget tristique. Donec ac commodo enim, ut hendrerit lectus. Aliquam diam magna, fringilla sit amet lorem eu, luctus vulputate ligula. Proin auctor lorem vel arcu tempor tincidunt. Sed posuere mauris eu magna auctor, vitae tincidunt urna tincidunt. Nullam vulputate enim ligula. Fusce euismod viverra ipsum, in mollis arcu vehicula at. Praesent dapibus ex vel ligula efficitur, sit amet varius leo aliquet. Integer sed sollicitudin tortor. Nunc vulputate tempus odio gravida dictum. Maecenas aliquam mi vitae ante pellentesque facilisis.</p><p>Donec sed nulla vitae risus scelerisque mollis sed sit amet sapien. Ut nec metus ac metus porttitor laoreet. Etiam dignissim lectus vel est tempor porta. Duis facilisis pellentesque egestas. Nullam a lacinia tortor. Phasellus est erat, rhoncus vitae dolor eu, aliquam euismod tortor. Donec tortor nisl, dignissim nec urna in, eleifend ultrices purus. Nam elementum, eros id volutpat fermentum, urna risus eleifend orci, non semper magna enim et mi. In a dictum ipsum, dignissim tristique urna. Quisque eu ante accumsan, euismod quam eget, porttitor lacus. Morbi lobortis vitae ex sit amet viverra. Fusce aliquet at risus eget bibendum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus a ullamcorper augue.</p><p>Cras consectetur, nisi et sagittis porttitor, quam nulla condimentum ligula, ac convallis justo diam nec odio. Maecenas ipsum nibh, viverra auctor viverra vel, finibus ut lectus. Fusce id vehicula urna, quis elementum sapien. Duis euismod pulvinar semper. Pellentesque semper nisl leo, ac malesuada diam tincidunt in. Donec eget nunc quis nulla luctus fringilla. Donec at est ut enim vulputate malesuada eu quis tellus. Cras faucibus nisl ac dignissim mattis. Nulla facilisi. Fusce mollis rutrum convallis. In non massa at dui blandit cursus nec quis leo.</p>';

    function initialize() {
      
    }

    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };
    initialize();

    
  });
