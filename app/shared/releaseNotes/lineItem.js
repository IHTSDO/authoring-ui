'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('lineItemCtrl', function ($scope, $modalInstance, $timeout, aagService, branch, lineItem) {

    // scope variables
    $scope.branch = branch;
    $scope.lineItem = lineItem;

    $scope.text = '<p><b>Revision of Teletherapy and Teleradiotherapy Procedures</b></p><p>;60 concepts which included &quot;teletherapy&quot; or &quot;teleradiotherapy&quot; in the FSN were updated to include &quot;external beam radiation therapy.&quot;</p><p>7 concepts which included &quot;external beam&quot; in the FSN were updated to include &quot;external beam radiation therapy&quot; in the FSN.</p></p><p>49569001 |Consultation in teletherapy (procedure)| was inactivated and replaced with a new concept: 1144767008 |Consultation in external beam radiation therapy (procedure)|.</p><p><br></p><p><b>Update to 271422003 |Fit denture (procedure)| Subhierarchy</b></p><p>;Concepts in the 271422003 |Fit denture (procedure)| subhierarchy have been remodeled with the finding site of 28035005 |Tooth, gum, and/or supporting structure (body structure)| or subtype.</p><p>Ambiguous concepts have been inactivated and replaced. For example 6502003 |Complete lower denture (procedure)| has been replaced by 1144276002 |Fitting of complete lower denture (procedure)|.</p><p>Changes have been made to approximately 25 concepts, including approximately 15 inactivations.</p>';

    function initialize() {
        $timeout(function () {
            var quill = new Quill('#editor', {
                theme: 'snow'
              });
            quill.setText(lineItem.content);
          }, 100);
        
    }

    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };
    initialize();
    
  });
