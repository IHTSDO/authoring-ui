// jshint ignore: start
angular.module('singleConceptAuthoringApp.search', [])

  .controller( 'searchCtrl', ['$scope', '$rootScope', '$location', '$routeParams', '$compile', 'metadataService', 'scaService', function AppCtrl ( $scope, $rootScope, $location, $routeParams, $compile, metadataService, scaService) {

    $scope.branch = metadataService.getBranch();
    var options = {
      release: $scope.branch,
      selectedView: "inferred",
      displayChildren: false,
      langRefset: "900000000000509007",
      closeButton: false,
      collapseButton: false,
      linkerButton: false,
      subscribersMarker: true,
      searchMode: "partialMatching",
      searchLang: "english",
      diagrammingMarkupEnabled: false,
      statusSearchFilter: "activeOnly",
      highlightByEffectiveTime: "false",
      taskSet: false,
      taskKey: null
    };

    $scope.saveUiStateForTask = function (projectKey, taskKey, panelId, uiState) {
      scaService.saveUiStateForTask(
        projectKey, taskKey, panelId, uiState)
        .then(function (uiState) {
        });
    };
    $scope.addToList = function (item) {

      // get item from results and disable the item element
      var component = $scope.findItem(item);
      console.log(component);
      if (!item) {
        return;
      }
      $("#bp-search_canvas-resultsTable").find("[data-concept-id='" + item + "'].addButton").attr("disabled", true);
      $("#bp-search_canvas-resultsTable").find("[data-concept-id='" + item + "'].addButton").css("background-color", "gray");

      // if not already in saved list
      if ($scope.findItemInSavedList(item) === false) {
        // push component on list and update ui state
        $scope.savedList.items.push(component);
        $scope.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, "saved-list", $scope.savedList);
      }
    };

    $scope.findItem = function (id) {
      if (!$scope.results) {
        return null;
      }
      if($scope.conceptIdSearch === true){
          var result = {
                concept : {
                    conceptId : $scope.results.conceptId,
                    FSN : $scope.results.term
                },
                term : $scope.results.term
          }
        return result;
      }
      for (var i = 0, len = $scope.results.length; i < len; i++) {
        if ($scope.results[i].concept.conceptId === id)
          return $scope.results[i];
      }
      return null;
    };
    $scope.findItemInSavedList = function (id) {
      if (!$scope.savedList || !$scope.savedList.items) {
        return false;
      }
      for (var i = 0, len = $scope.savedList.items.length; i < len; i++) {
        if ($scope.savedList.items[i].concept.conceptId === id) {
          return true;
        }
      }
      return false;
    };

    // drag and drop object
    // NOTE: Search plugin returns weird names it seems
    // so leave retrieval to the drop target function
    $scope.getConceptPropertiesObj = function (conceptId) {
      return {id: conceptId, name: null};
    };

    var componentsRegistry = [];
    var spa = new searchPanel(document.getElementById("bp-search_canvas"), options);

    function searchPanel(divElement, options) {
      var thread = null;
      var panel = this;
      this.subscribers = [];
      var lastT = "";
      var xhr = null;
      if (typeof componentsRegistry === "undefined") {
        componentsRegistry = [];
      }

      this.markerColor = 'black';
      this.type = "search";
      this.divElement = divElement;
      this.options = jQuery.extend(true, {}, options);
      var componentLoaded = false;
      $.each(componentsRegistry, function (i, field) {
        if (field.divElement.id === panel.divElement.id) {
          componentLoaded = true;
        }
      });
      if (componentLoaded === false) {
        componentsRegistry.push(panel);
      }

      this.history = [];
      this.setupCanvas = function () {
        var searchHtml = "<div style='5px 0px; height:95%;' class='panel panel-default'>";
        searchHtml = searchHtml + "<div style='height:100%; padding-left:8px;' id='" + panel.divElement.id + "-panelBody'>";
        searchHtml = searchHtml + '<form>';
        searchHtml = searchHtml + '<div class="form-group" style="margin-bottom: 2px;">';
        searchHtml = searchHtml + '<div class="btn-group col-md-12 grey lighten-5 no-padding"><span class="pull-left search-snomed no-padding"><input type="search" class="form-control m-5" id="' + panel.divElement.id + '-searchBox" placeholder="Enter search terms here" autocomplete="off"></span>';
        searchHtml = searchHtml + '<span class="pull-right"><span id="'+ panel.divElement.id + '-clearButton" class="btn btn-round search-button btn-default grey lighten-5 snomed-clear"><span class="md md-clear"></span></span></span></div>';
        searchHtml = searchHtml + '</div>';
        searchHtml = searchHtml + '</form>';
        searchHtml = searchHtml + "<table id='" + panel.divElement.id + "-resultsTable' class='table table-bordered grey lighten-5 col-md-12 no-padding'>";
        searchHtml = searchHtml + "</table>";
        searchHtml = searchHtml + "</div>";
        searchHtml = searchHtml + "</div>";
        searchHtml = searchHtml + "</div>";
        $(divElement).html(searchHtml);
        //added to re-enable automatic triggering of the search after three chars have been entered. Swap with the below to
        //change back to triggering only on the pressing of return.
        $('#' + panel.divElement.id + '-searchBox').keyup(function () {
            clearTimeout(thread);
            var $this = $(this);
            thread = setTimeout(function () {
                panel.search($this.val(),0,100,false);
            }, 500);
        });

        $("#" + panel.divElement.id + "-expandButton").hide();
        $("#" + panel.divElement.id + "-subscribersMarker").hide();

        $("#" + panel.divElement.id).find('.semtag-button').click(function (event) {
          console.log("Semtag click: " + $(this).html());
        });

        if (options.searchMode !== "fullText") {
          $("#" + panel.divElement.id + '-navLanguageLabel').closest('a').hide();
        }

        $("#" + panel.divElement.id + "-configButton").click(function (event) {
          $("#" + panel.divElement.id + "-searchConfigBar").slideToggle('slow');
        });

        if (typeof panel.options.closeButton !== "undefined" && panel.options.closeButton === false) {
          $("#" + panel.divElement.id + "-closeButton").hide();
        }

        if (typeof panel.options.linkerButton !== "undefined" && panel.options.linkerButton === false) {
          $("#" + panel.divElement.id + "-linkerButton").hide();
        }

        if (typeof panel.options.subscribersMarker !== "undefined" && panel.options.subscribersMarker === false) {
          $("#" + panel.divElement.id + "-subscribersMarker").remove();
        }

        if (typeof panel.options.collapseButton !== "undefined" && panel.options.collapseButton === false) {
          $("#" + panel.divElement.id + "-expandButton").hide();
          $("#" + panel.divElement.id + "-collapseButton").hide();
        }

        $("#" + panel.divElement.id + "-expandButton").click(function (event) {
          $("#" + panel.divElement.id + "-panelBody").slideDown("fast");
          $("#" + panel.divElement.id + "-expandButton").hide();
          $("#" + panel.divElement.id + "-collapseButton").show();
        });
        $("#" + panel.divElement.id + "-collapseButton").click(function (event) {
          $("#" + panel.divElement.id + "-panelBody").slideUp("fast");
          $("#" + panel.divElement.id + "-expandButton").show();
          $("#" + panel.divElement.id + "-collapseButton").hide();
        });
        $("#" + panel.divElement.id + "-configButton").tooltip({
          placement : 'left',
          trigger: 'hover',
          animation: true,
          delay: 1000
        });
        $("#" + panel.divElement.id + "-historyButton").tooltip({
          placement : 'left',
          trigger: 'hover',
          animation: true,
          delay: 1000
        });
        $("#" + panel.divElement.id + "-linkerButton").tooltip({
          placement : 'left',
          trigger: 'hover',
          animation: true,
          delay: 1000
        });

        $("#" + panel.divElement.id + "-linkerButton").draggable({
          cancel: false,
          appendTo: 'body',
          helper: 'clone',
          delay: 500
        });
        $("#" + panel.divElement.id + "-linkerButton").droppable({
          drop: panel.handlePanelDropEvent,
          hoverClass: "bg-info"
        });
        $("#" + panel.divElement.id + "-apply-button").click(function () {
          panel.readOptionsPanel();
          var searchTerm = $('#' + panel.divElement.id + '-searchBox').val();
          console.log("searchTerm: " + searchTerm);
        });
        $("#" + panel.divElement.id + "-clearButton").click(function () {
          panel.options.semTagFilter = "none";
          panel.options.langFilter = "none";
          $('#' + panel.divElement.id + '-searchBox').val('');
          $('#' + panel.divElement.id + '-searchFilters').html("");
          $('#' + panel.divElement.id + '-resultsTable').html("");
          $('#' + panel.divElement.id + '-searchBar').html("");
          $('#' + panel.divElement.id + '-typeIcon').removeClass('glyphicon-ok');
          $('#' + panel.divElement.id + '-typeIcon').removeClass('text-success');
          $('#' + panel.divElement.id + '-typeIcon').addClass('glyphicon-remove');
          $('#' + panel.divElement.id + '-typeIcon').addClass('text-danger');
          lastT = "";
        });
        $("#" + panel.divElement.id + "-historyButton").click(function (event) {
          $("#" + panel.divElement.id + "-historyButton").popover({
            trigger: 'manual',
            placement: 'bottomRight',
            html: true,
            content: function () {
              historyHtml = '<div style="height:100px;overflow:auto;">';
              if (panel.history.length === 0) {
                historyHtml = historyHtml + '<div class="text-center text-muted" style="width:100%"><em>'+ '' + '</span>...</em></div>';
              }
              historyHtml = historyHtml + '<table>';
              var reversedHistory = panel.history.slice(0);
              reversedHistory.reverse();
              $.each(reversedHistory, function (i, field) {
                var d = new Date();
                var curTime = d.getTime();
                var ago = curTime - field.time;
                var agoString = "";
                if (ago < (1000 * 60)) {
                  if (Math.round((ago / 1000)) === 1) {
                    agoString = Math.round((ago / 1000)) + ' second ago';
                  } else {
                    agoString = Math.round((ago / 1000)) + ' seconds ago';
                  }
                } else if (ago < (1000 * 60 * 60)) {
                  if (Math.round((ago / 1000) / 60) === 1) {
                    agoString = Math.round((ago / 1000) / 60) + ' minute ago';
                  } else {
                    agoString = Math.round((ago / 1000) / 60) + ' minutes ago';
                  }
                } else if (ago < (1000 * 60 * 60 * 60)) {
                  if (Math.round(((ago / 1000) / 60) / 60) === 1) {
                    agoString = Math.round(((ago / 1000) / 60) / 60) + ' hour ago';
                  } else {
                    agoString = Math.round(((ago / 1000) / 60) / 60) + ' hours ago';
                  }
                }
                historyHtml = historyHtml + '<tr><td><a href="javascript:void(0);" onclick="searchInPanel(\'' + panel.divElement.id + '\',\'' + field.searchTerm + '\');">' + field.searchTerm + '</a>';
                historyHtml = historyHtml + ' <span class="text-muted" style="font-size: 80%"><em>' + agoString + '<em></span>';
                historyHtml = historyHtml + '</td></tr>';
              });
              historyHtml = historyHtml + '</table>';
              historyHtml = historyHtml + '</div>';
              return historyHtml;
            }
          });
          $("#" + panel.divElement.id + "-historyButton").popover('toggle');
        });
        $("#" + panel.divElement.id + "-linkerButton").click(function (event) {
          $("#" + panel.divElement.id + "-linkerButton").popover({
            trigger: 'manual',
            placement: 'bottomRight',
            html: true,
            content: function () {
              var linkerHtml = '<div class="text-center text-muted"><em><span class="i18n" data-i18n-id="i18n_drag_to_link">Drag to link with other panels</span><br>';
              if (panel.subscribers.length === 1) {
                linkerHtml = linkerHtml + panel.subscribers.length + ' link established</em></div>';
              } else {
                linkerHtml = linkerHtml + panel.subscribers.length + ' links established</em></div>';
              }
              linkerHtml = linkerHtml + '<div class="text-center"><a href="javascript:void(0);" onclick="clearSearchPanelSubscriptions(\'' + panel.divElement.id + '\');"><span class="i18n" data-i18n-id="i18n_clear_links">Clear links</span></a></div>';
              return linkerHtml;
            }
          });
          $("#" + panel.divElement.id + "-linkerButton").popover('toggle');
        });

        $("#" + panel.divElement.id + "-partialMatchingButton").click(function (event) {
          panel.options.searchMode = 'partialMatching';
          var searchTerm = $('#' + panel.divElement.id + '-searchBox').val();
          $("#" + panel.divElement.id + '-navLanguageLabel').closest('a').hide();
          if (searchTerm.charAt(0) === "^") {
            $("#" + panel.divElement.id + '-searchBox').val(searchTerm.slice(1));
          }
        });

      }

      this.handlePanelDropEvent = function (event, ui) {
        var draggable = ui.draggable;
        if (!draggable.attr('data-panel')) {
        } else {
          $.each(componentsRegistry, function (i, field) {
            if (field.divElement.id === draggable.attr('data-panel')) {
              if (field.type === "concept-details") {
                panel.subscribe(field);
              }
            }
          });
        }
      }

      this.search = function (t, skipTo, returnLimit, forceSearch) {
        if (typeof panel.options.searchMode === "undefined") {
          panel.options.searchMode = "partialMatching";
        }
        if (typeof panel.options.semTagFilter === "undefined") {
          panel.options.semTagFilter = "none";
        }
        if (typeof panel.options.langFilter === "undefined") {
          panel.options.langFilter = "none";
        }

        if (typeof forceSearch === "undefined") {
          forceSearch = false;
        }
        if (t !== "" && (t !== lastT || forceSearch)) {
          if (t.length < 3) {
            $('#' + panel.divElement.id + '-typeIcon').removeClass('glyphicon-ok');
            $('#' + panel.divElement.id + '-typeIcon').removeClass('text-success');
            $('#' + panel.divElement.id + '-typeIcon').addClass('glyphicon-remove');
            $('#' + panel.divElement.id + '-typeIcon').addClass('text-danger');
          } else {
            $('#' + panel.divElement.id + '-typeIcon').removeClass('glyphicon-remove');
            $('#' + panel.divElement.id + '-typeIcon').removeClass('text-danger');
            $('#' + panel.divElement.id + '-typeIcon').addClass('glyphicon-ok');
            $('#' + panel.divElement.id + '-typeIcon').addClass('text-success');
            if (t !== lastT) {
              panel.options.semTagFilter = "none";
              panel.options.langFilter = "none";
            }
            lastT = t;
            var d = new Date();
            var time = d.getTime();
            panel.history.push({searchTerm: t, time: time});
            $('#' + panel.divElement.id + '-searchFilters').html("");
            if (skipTo === 0) {
              $('#' + panel.divElement.id + '-resultsTable').html("<i class='glyphicon glyphicon-refresh icon-spin'></i>");
            } else {
              $('#' + panel.divElement.id + '-resultsTable').find('.more-row').html("<td colspan='2' class='text-center'><i class='glyphicon glyphicon-refresh icon-spin'></i>&nbsp;&nbsp;</td>");
            }
            var resultsHtml = "";
            if (xhr !== null) {
              xhr.abort();
              console.log("aborting call...");
            }
            $('#' + panel.divElement.id + '-searchBar').html("<span class='text-muted'>Searching..</span>");
            t = t.trim();
            if (isNumber(t)) {
              if (t.substr(-2, 1) === "0") {
                // Search conceptId
                xhr = $.getJSON(options.serverUrl + "/" + options.edition + "/" + options.release + "/concepts/" + t,function (result) {
                $scope.conceptIdSearch = true;
                }).done(function (result) {

                  $.each(result.descriptions, function (index, field) {
                    if(field.type === "FSN" && field.active === true)
                    {
                    $scope.results = field;
                    resultsHtml = resultsHtml + "<tr ui-draggable='true' drag='getConceptPropertiesObj(" + result.conceptId + ")' drag-channel='conceptPropertiesObj' drop-channel='' class='resultRow selectable-row";
                    if (result.active === false) {
                    }
                    else{
                      resultsHtml = resultsHtml + "'><td class='col-md-5'><div style='word-break: break-all' class='result-item' data-concept-id='" + result.conceptId + "' data-term='" + field.term + "'>" + field.term + "</div></td><td class='text-muted small-text col-md-6 result-item' style='word-break: break-all' data-concept-id='" + result.conceptId + "' data-term='" + field.term + "'>" + field.term + "</td><td class='col-md-1'><button data-concept-id='" + result.conceptId + "' class='addButton btn btn-round btn-default widget-button grey lighten-5'></i><span class='md md-playlist-add'></span></button></td></tr></td></tr>"
                    }
                    }
                  });

                  $('#' + panel.divElement.id + '-resultsTable').html(resultsHtml);
                  $('#' + panel.divElement.id + '-searchBar').html("<span class='text-muted'></span>");
                  $('#' + panel.divElement.id + '-resultsTable').find(".jqui-draggable").draggable({
                    appendTo: 'body',
                    helper: 'clone',
                    delay: 500
                  });
                  $('#' + panel.divElement.id + '-resultsTable').find(".result-item").click(function (event) {
                    $.each(panel.subscribers, function (i, field) {
                      field.conceptId = $(event.target).attr('data-concept-id');
                      field.updateCanvas();
                    });
                  });
                });
              } else if (t.substr(-2, 1) === "1") {
                xhr = $.getJSON(options.serverUrl + "/" + options.edition + "/" + options.release + "/descriptions/" + t,function (result) {

                }).done(function (result) {
                  $scope.results = result.matches;
                  $.each(result.matches, function (field) {
                    resultsHtml = resultsHtml + "<tr ui-draggable='true' drag='getConceptPropertiesObj(" + field.concept.conceptId + ")' drag-channel='conceptPropertiesObj' drop-channel='' class='resultRow selectable-row";
                    if (field.concept.active === false) {
                    }
                    else{
                      resultsHtml = resultsHtml + "'><td class='col-md-5'><div class='result-item' style='word-break: break-all' data-concept-id='" + field.concept.conceptId + "' data-term='" + field.term + "'>" + field.term + "</div></td><td class='text-muted small-text col-md-6 result-item' style='word-break: break-all' data-concept-id='" + field.concept.conceptId + "' data-term='" + field.term + "'>" + field.concept.fsn + "</td><td class='col-md-1'><button data-concept-id='" + field.concept.conceptId + "' class='addButton'><i class='glyphicon glyphicon-pencil'</button></td></tr>"
                    }
                  });
                  $('#' + panel.divElement.id + '-resultsTable').html(resultsHtml);
                  $('#' + panel.divElement.id + '-searchBar').html("<span class='text-muted'></span>");
                  $('#' + panel.divElement.id + '-resultsTable').find(".jqui-draggable").draggable({
                    appendTo: 'body',
                    helper: 'clone',
                    delay: 500
                  });
                  $('#' + panel.divElement.id + '-resultsTable').find(".result-item").click(function (event) {
                    $.each(panel.subscribers, function (i, field) {
                      field.conceptId = $(event.target).attr('data-concept-id');
                      field.updateCanvas();
                    });
                  });
                });
              } else {
                resultsHtml = resultsHtml + "<tr><td class='text-muted'>No results</td></tr>";
                $('#' + panel.divElement.id + '-resultsTable').html(resultsHtml);
                $('#' + panel.divElement.id + '-searchBar').html("<span class='text-muted'></span>");
              }
            } else {
              if (panel.options.searchMode === "partialMatching") {
                t = t.toLowerCase();
              }
              var startTime = Date.now();
              var searchUrl = options.serverUrl + "/" + options.edition + "/" + options.release + "/descriptions?query=" + t + "&limit=50&searchMode=" + panel.options.searchMode + "&lang=" + panel.options.searchLang + "&statusFilter=" + panel.options.statusSearchFilter + "&skipTo=" + skipTo + "&returnLimit=" + returnLimit;
              if (panel.options.semTagFilter !== "none") {
                searchUrl = searchUrl + "&semanticFilter=" + panel.options.semTagFilter;
              }
              if (panel.options.langFilter !== "none") {
                searchUrl = searchUrl + "&langFilter=" + panel.options.langFilter;
              }
              xhr = $.getJSON(searchUrl,function (result) {

              }).done(function (result) {
                $('#' + panel.divElement.id + '-resultsTable').find('.more-row').remove();
                var endTime = Date.now();
                var elapsed = (endTime - startTime)/1000;
                xhr = null;
                var matchedDescriptions = result;

                if (!matchedDescriptions || matchedDescriptions.length <= 0) {
                  resultsHtml = resultsHtml + "<tr><td class='text-muted'>No results</td></tr>";
                  $('#' + panel.divElement.id + '-resultsTable').html(resultsHtml);
                } else {
                  var searchFiltersHtml = "<span class='pull right'><a class='btm btn-xs' style='margin: 3px; color: #777; background-color: #fff; border: 1px #ccc solid; margin-left: 25px;' data-toggle='collapse' href='#" + panel.divElement.id + "-searchFiltersPanel'><span class='i18n' data-i18n-id='i18n_filters'>Filters</span></a>";
                  if (panel.options.semTagFilter !== "none") {
                    searchFiltersHtml = searchFiltersHtml + "&nbsp;&nbsp;<span class='label label-danger'>" + panel.options.semTagFilter + "&nbsp;<a href='javascript:void(0);' style='color: white;text-decoration: none;' class='remove-semtag'>&times;</a></span>&nbsp;&nbsp;";
                  }
                  if (panel.options.langFilter !== "none") {
                    searchFiltersHtml = searchFiltersHtml + "&nbsp;&nbsp;<span class='label label-danger'>" + panel.options.langFilter + "&nbsp;<a href='javascript:void(0);' style='color: white;text-decoration: none;' class='remove-lang'>&times;</a></span>&nbsp;&nbsp;";
                  }
                  searchFiltersHtml = searchFiltersHtml + "</span><div id='" + panel.divElement.id + "-searchFiltersPanel' class='panel-collapse collapse'>";
                  searchFiltersHtml = searchFiltersHtml + "<div class='tree'><ul><li><a>Filter results by Language</a><ul>";

                  searchFiltersHtml = searchFiltersHtml + "</ul></li></ul>";
                  searchFiltersHtml = searchFiltersHtml + "<ul><li><a>Filter results by Semantic Tag</a><ul>";

                  searchFiltersHtml = searchFiltersHtml + "</ul></li></ul></div>";
                  $('#' + panel.divElement.id + '-searchBar').html($('#' + panel.divElement.id + '-searchBar').html() + searchFiltersHtml);
                  $("#" + panel.divElement.id + '-searchBar').find('.semtag-link').click(function (event) {
                    panel.options.semTagFilter = $(event.target).attr('data-semtag');
                    panel.search(t, 0, returnLimit, true);
                  });
                  $("#" + panel.divElement.id + '-searchBar').find('.lang-link').click(function (event) {
                    panel.options.langFilter = $(event.target).attr('data-lang');
                    panel.search(t, 0, returnLimit, true);
                  });
                  $("#" + panel.divElement.id + '-searchBar').find('.remove-semtag').click(function (event) {
                    panel.options.semTagFilter = "none";
                    panel.search(t, 0, returnLimit, true);
                  });
                  $("#" + panel.divElement.id + '-searchBar').find('.remove-lang').click(function (event) {
                    panel.options.langFilter = "none";
                    panel.search(t, 0, returnLimit, true);
                  });

                  if (panel.options.searchMode === "regex") {
                    matchedDescriptions.sort(function (a, b) {
                      if (a.term.length < b.term.length)
                        return -1;
                      if (a.term.length > b.term.length)
                        return 1;
                      return 0;
                    });
                  }
                  $.each(matchedDescriptions, function (i, field) {
                    $scope.results = matchedDescriptions;
                    resultsHtml = resultsHtml + "<tr ui-draggable='true' drag='getConceptPropertiesObj(" + field.concept.conceptId + ")' drag-channel='conceptPropertiesObj' drop-channel='' class='resultRow selectable-row";
                    if (field.concept.active === false) {
                    }
                    else{

                      resultsHtml = resultsHtml + "'><td class='col-md-5'><div class='result-item' style='word-break: break-all' data-concept-id='" + field.concept.conceptId + "' data-term='" + "OHAI3 " +  field.term + "'>" + field.term + "</div></td><td style='word-break: break-all' class='text-muted small-text col-md-6 result-item'  data-concept-id='" + field.concept.conceptId + "' data-term='" + field.term + "'>" + field.concept.fsn + "</td><td class='col-md-1'><button data-concept-id='" + field.concept.conceptId + "' class='addButton btn btn-round btn-default widget-button grey lighten-5'></i><span class='md md-playlist-add'></span></button></td></tr>"
                    }
                  });


                  // PG Need to compile added html for angular
                  $('#' + panel.divElement.id + '-resultsTable').html(
                    $compile(resultsHtml)($scope));
                  $("#" + panel.divElement.id + "-more").click(function (event) {
                    panel.search(t, (parseInt(skipTo) + parseInt(returnLimit)), returnLimit, true);
                  });


                  $('#' + panel.divElement.id + '-resultsTable').find(".jqui-draggable").draggable({
                    appendTo: 'body',
                    helper: 'clone',
                    delay: 500
                  });
                  $('#' + panel.divElement.id + '-resultsTable').find(".result-item").click(function (event) {
                    $.each(panel.subscribers, function (i, field) {
                      field.conceptId = $(event.target).attr('data-concept-id');
                      field.updateCanvas();
                      lastClickedSctid = $(event.target).attr('data-concept-id');
                      lastClickTime = Date.now();
                    });
                  });
                }
              }).fail(function () {
                resultsHtml = resultsHtml + "<tr><td class='text-muted'>No results</td></tr>";
                $('#' + panel.divElement.id + '-resultsTable').html(resultsHtml);
              });
            }
          }
        }
        $('#bp-search_canvas-resultsTable').on("click", ".addButton", function() {
          $scope.addToList($(this).attr('data-concept-id'));
        });
      }

      this.subscribe = function (subscriber) {
        var alreadySubscribed = false;
        $.each(panel.subscribers, function (i, field) {
          if (subscriber.divElement.id === field.divElement.id) {
            alreadySubscribed = true;
          }
        });
        if (!alreadySubscribed) {
          if (panel.subscribers.length === 0) {
            if (typeof globalMarkerColor === "undefined") {
              globalMarkerColor = 'black';
            }
            panel.markerColor = panel.getNextMarkerColor(globalMarkerColor);
            $("#" + panel.divElement.id + "-subscribersMarker").css('color', panel.markerColor);
            $("#" + panel.divElement.id + "-subscribersMarker").show();
          }
          panel.subscribers.push(subscriber);
          subscriber.setSubscription(panel);
        }
      }

      this.unsubscribe = function (subscriber) {
        var indexToRemove = -1;
        var i = 0;
        $.each(panel.subscribers, function (i, field) {
          if (subscriber.divElement.id === field.divElement.id) {
            indexToRemove = i;
          }
          i = i + 1;
        });
        if (indexToRemove > -1) {
          panel.subscribers.splice(indexToRemove, 1);
        }
        if (panel.subscribers.length === 0) {
          $("#" + panel.divElement.id + "-subscribersMarker").hide();
        }
        subscriber.clearSubscription();
      }

      this.unsubscribeAll = function () {
        var subscribersClone = panel.subscribers.slice(0);
        $.each(subscribersClone, function (i, field) {
          panel.unsubscribe(field);
        });
      }

      this.getNextMarkerColor = function (color) {
        var returnColor = 'black';
        if (color === 'black') {
          returnColor = 'green';
        } else if (color === 'green') {
          returnColor = 'purple';
        } else if (color === 'purple') {
          returnColor = 'red';
        } else if (color === 'red') {
          returnColor = 'blue';
        } else if (color === 'blue') {
          returnColor = 'green';
        }
        globalMarkerColor = returnColor;
        return returnColor;
      }

      this.setupCanvas();

    }

    function isNumber(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function clearSearchPanelSubscriptions(divElementId1) {
      var d1;
      $.each(componentsRegistry, function(i, field) {
        if (field.divElement.id === divElementId1) {
          d1 = field;
        }
      });
      d1.unsubscribeAll();
      $("#" + divElementId1).find('.linker-button').popover('toggle');
    }

    function searchInPanel(divElementId, searchTerm) {
      $.each(componentsRegistry, function (i, field) {
        if (field.divElement.id === divElementId) {
          $('#' + divElementId + '-searchBox').val(searchTerm);
          field.search(searchTerm,0,100,false);
        }
      });
      $('.history-button').popover('hide');
    }

    $(document).keypress(function (event) {
      if (event.which === '13') {
        event.preventDefault();
      }
    });

    (function($) {
      $.fn.addSearch = function(options) {
        this.filter("div").each(function() {
          var tx = new conceptDetails(this, options);
        });
      };

    }(jQuery));
  }]);
