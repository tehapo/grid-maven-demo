window.addEventListener("load", function() {
    'use strict';

    var rowCache = [];
    var zeroClipboard = new ZeroClipboard();
    function getUrl(searchString, start, rows) {
        var url = 'http://' + window.location.hostname + ':8888?q=' + searchString;
        url += '&start=' + start;
        url += '&rows=' + rows;
        return url;
    }

    function getPomText(data) {
        var pom = '&lt;dependency&gt;';
        pom += '&lt;groupId&gt;' + data.groupId + '&lt;/groupId&gt';
        pom += '&lt;artifactId&gt;' + data.artifactId + '&lt;/artifactId&gt';
        pom += '&lt;version&gt;' + data.latestVersion + '&lt;/version&gt';
        pom += '&lt;/dependency&gt';
        return pom;
    }

    var renderers = {

        faviconFallback: 'https://vaadin.com/vaadin-download-portlet/icons/jar.png',
        faviconBlacklist: [],

        groupId: function(element, x, data) {
            var domain = data.groupId.split(".");
            if (domain.length >= 2) {
                domain = domain.reverse().splice(-2);
                domain = domain[0] + '.' + domain[1];
            } else {
                domain = null;
            }

            $(element).html("");
            if (domain !== null && renderers.faviconBlacklist.indexOf(domain) === -1) {
                $(element).append('<img src="http://' + domain + '/favicon.ico" class="favicon" />');
                $(element).find(".favicon").error(function() {
                    this.src = renderers.faviconFallback;
                    renderers.faviconBlacklist.push(domain);
                });
            } else {
                $(element).append('<img src="' + renderers.faviconFallback + '" class="favicon" />');
            }
            $(element).append(data.groupId);
        },

        updated: function(element, x, data) {
            if (new Date().getTime() - data.updated < 1000 * 60 * 60 * 24 * 30) {
                $(element).addClass("new");
            } else {
                $(element).removeClass("new");
            }
            element.innerHTML = new Date(data.updated).toLocaleDateString();
        },

        clipboard: function(element, x, data) {
            $(element)
                    .addClass('clipboard')
                    .html('<img src="img/clipboard.png" title="Copy to clipboard" data-clipboard-text="' + getPomText(data) + '" />');

            // Hook ZeroClipboard.
            var img = element.querySelector('img');
            zeroClipboard.clip(img);
            zeroClipboard.on('copy', function(event) {
                $('#status').html('Copied to clipboard').addClass('display');
                window.setTimeout(function() {
                    $('#status').removeClass('display');
                }, 2000);
            });
        },

        javadoc: function(element, x, data) {
            if (data.javadoc) {
                $(element)
                        .addClass('javadoc')
                        .html('<a href="http://demo.vaadin.com/javadoc/' + data.groupId + '/' + data.artifactId + '/' + data.latestVersion + '/">Javadoc</a>');
            }
        }

    };

    // Keyup -> input value -> throttle -> url -> JSON request -> response.
    var searchInit = Rx.Observable
            .fromEvent(document.getElementById('search'), 'keyup')
            .map(function(e) {
                return e.target.value;
            })
            .filter(function(val) {
                return val.length > 1;
            })
            .throttleWithTimeout(500)
            .map(function(s) {
                return getUrl(s, 0, 0);
            })
            .flatMap(function(url) {
                return Rx.Observable.fromPromise($.getJSON(url));
            })
            .map(function(responseObj) {
                return responseObj.response;
            });

    // Update data source when new search initialized.
    searchInit.subscribe(function(response) {
        rowCache = [];  // Empty cache.
        var grid = document.getElementById('grid');
        grid.rowCount = response.numFound;
        grid.columns[0].renderer = renderers.groupId;
        grid.columns[3].renderer = renderers.updated;
        grid.columns[4].renderer = renderers.clipboard;
        grid.columns[5].renderer = renderers.javadoc;
        grid.dataSource = function(index, count, callback) {
            $.getJSON(getUrl($("#search").val(), index, count), function(data) {
                // Map the items to data needed for the grid.
                var currentPage = data.response.docs.map(function(item) {
                    return {
                        groupId: item.g,
                        artifactId: item.a,
                        latestVersion: item.latestVersion,
                        updated: item.timestamp,
                        javadoc: (item.text.indexOf('-javadoc.jar') !== -1)
                    };
                });
                // Copy the items to cache.
                for (var i = index; i < index + currentPage.length; i++) {
                    rowCache[i] = currentPage[i - index];
                }
                callback(currentPage);
            });
        };
    }, function(err) {
        window.alert("Something went wrong, could not contact the server.");
    });

    // Wire up selection.
    // TODO remove if not needed.
    var selection = Rx.Observable
            .fromEvent(document.getElementById('grid'), 'select')
            .map(function(e) {
                return e.target.selectedRow;
            })
            .filter(function(rowIndex) {
                return rowIndex >= 0;
            })
            .map(function(rowIndex) {
                return rowCache[rowIndex];
            });

    // Focus the search field.
    document.getElementById('search').focus();
});
