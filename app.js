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

    // Keyup -> input value -> throttle -> url -> JSON request -> response.
    var searchInit = Rx.Observable
    .fromEvent(document.getElementById('search'), 'keyup')
    .map(function(e) { return e.target.value; })
    .filter(function(val) { return val.length > 1; })
    .throttleWithTimeout(500)
    .map(function(s) { return getUrl(s, 0, 0); })
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
        grid.columns[grid.columns.length - 1].renderer = function(element, x, data) {
            element.innerHTML = '<img src="img/clipboard.png" title="Copy to clipboard" data-clipboard-text="' + getPomText(data) + '" />';

            // Hook ZeroClipboard to
            var img = element.querySelector('img');
            zeroClipboard.clip(img);
            zeroClipboard.on('copy', function(event) {
                $('#status').html('Copied to clipboard').addClass('display');
                window.setTimeout(function() {
                    $('#status').removeClass('display');
                }, 2000);
            });
        };
        grid.dataSource = function(index, count, callback) {
            $.getJSON(getUrl($("#search").val(), index, count), function(data) {
                // Map the items to data needed for the grid.
                var currentPage = data.response.docs.map(function(item) {
                    var updatedStamp = new Date(item.timestamp);
                    return {
                        groupId: item.g,
                        artifactId: item.a,
                        latestVersion: item.latestVersion,
                        updated: updatedStamp.toLocaleDateString()
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
    .map(function(e) { return e.target.selectedRow; })
    .filter(function(rowIndex) { return rowIndex >= 0; })
    .map(function(rowIndex) { return rowCache[rowIndex]; });

    // Focus the search field.
    document.getElementById('search').focus();
});
