/*
  --------------------------------------------------------
  ---------------------- MapController -------------------
  --------------------------------------------------------
*/
var MapController = (function () {

    // map constants
    var MapConstants = {
        DEFAULT_LATITUDE: 50.084218,
        DEFAULT_LONGITUDE: 14.441196,
        DEFAULT_ZOOM: 15,
        DEFAULT_MAP_TYPE: 'terrain',
        MIN_TRACK_POINT_DELTA: 0.0001,
        SAMPLES: 512,
        STROKE_COLOR_DEFAULT: '#FF0000',
        STROKE_COLOR_SELECTED: '#000000'
    }

    // variables

    var map, chart, elevationService;
    var currentLatitude = MapConstants.DEFAULT_LATITUDE;
    var currentLongitude = MapConstants.DEFAULT_LONGITUDE;

    var mousemarker = null;


    // Remove the green rollover marker when the mouse leaves the chart
    function clearMouseMarker() {
        if (mousemarker != null) {
            mousemarker.setMap(null);
            mousemarker = null;
        }
    }
    /*
        center map
      */
    var centerMap = function () {
        map.setCenter(new google.maps.LatLng(parseFloat(currentLatitude), parseFloat(currentLongitude)));
    };

    /*
    find position - cheated code sttructure
    */
    var findPosition = function () {
        // get current location
        // check if  Geolocation API is available
        if (!navigator.geolocation) {
            console.log('Geolocation API not available');
            // Geolocation API not available - use default
            currentLatitude = MapConstants.DEFAULT_LATITUDE;
            currentLongitude = MapConstants.DEFAULT_LONGITUDE;

        } else {
            console.log('Geolocation API is available');
            // asynchronous
            navigator.geolocation.getCurrentPosition(function (position) {
                    // Get the coordinates of the current possition.
                    currentLatitude = position.coords.latitude;
                    currentLongitude = position.coords.longitude;
                    centerMap();
                },
                // Optional error callback
                function (error) {
                    //alert('Position is unknown. It will be used a default one! Error code: ' + error.code)
                    console.log(error);
                    currentLatitude = MapConstants.DEFAULT_LATITUDE;
                    currentLongitude = MapConstants.DEFAULT_LONGITUDE;
                    centerMap();
                }
            );
        }
    };

    /*
    show elevation chart for first track. Callback method is  plotElevation
    */
    function showElevation(track) {
        // elevation is already ploted
        if (!track || track.isPloted) {
            return;
        }
        track.isPloted = true;
        // track with elevation should be black
        track.polyline.setOptions({
            strokeColor: MapConstants.STROKE_COLOR_SELECTED,
        });
        document.getElementById("divDistance").style.display = 'block';
        document.getElementById("distance").innerHTML = (track.polyline.Distance() / 1000).toFixed(2) + " km";
        // It seems there is a limit for points.
        // better solution would be to delete nearest points
        newPath = [];
        for (var i = 0; i < track.latlngArray.length; i++) {
            if (i < 1840) {
                newPath.push(track.latlngArray[i]);
            }
        }

        elevationService.getElevationAlongPath({
            path: newPath,
            samples: MapConstants.SAMPLES
        }, plotElevation);
    };

    // Takes an array of ElevationResult objects, draws the path on the map
    // and plots the elevation profile on a GViz ColumnChart
    function plotElevation(results) {
        var polyline;

        if (results === null) {
            return;
        }
        elevations = results;

        var path = [];
        for (var i = 0; i < results.length; i++) {
            path.push(elevations[i].location);
        }

        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Sample');
        data.addColumn('number', 'Elevation');
        for (var i = 0; i < results.length; i++) {
            data.addRow(['', elevations[i].elevation]);
        }

        document.getElementById('chart_div').style.display = 'block';
        chart.draw(data, {
            width: 512,
            height: 200,
            legend: 'none',
            titleY: 'Elevation (m)',
            focusBorderColor: '#00ff00'
        });

        // listener k zobrazeni zeleneho bodu na mape, pokud se prejizdi mysi po profilu

        google.visualization.events.addListener(chart, 'onmouseover', function (e) {
            if (mousemarker == null) {
                mousemarker = new google.maps.Marker({
                    position: elevations[e.row].location,
                    map: map,
                    icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                });
            } else {
                mousemarker.setPosition(elevations[e.row].location);
            }
        });

    };

    var showTrack = function (track, data) {
        var pointarray = [];
        // process first point
        var lastlat = parseFloat(track.points[0].lat);
        var lastlon = parseFloat(track.points[0].long);
        var latlng = new google.maps.LatLng(lastlat, lastlon);
        pointarray.push(latlng);
        for (var i = 1; i < track.points.length; i++) {
            var lat = parseFloat(track.points[i].lat);
            var lon = parseFloat(track.points[i].long);
            // Verify that this is far enough away from the last point to be used.
            var latdiff = lat - lastlat;
            var londiff = lon - lastlon;
            if (Math.sqrt(latdiff * latdiff + londiff * londiff) >
                MapConstants.MIN_TRACK_POINT_DELTA) {
                lastlon = lon;
                lastlat = lat;
                latlng = new google.maps.LatLng(lat, lon);
                pointarray.push(latlng);
            }
        }

        var path = new google.maps.Polyline({
            path: pointarray,
            geodesic: true,
            strokeColor: MapConstants.STROKE_COLOR_DEFAULT,
            strokeOpacity: 1.0,
            strokeWeight: 2
        });
        path.setMap(map);
        track.latlngArray = pointarray;
        track.polyline = path;
    };

    var centerAndZoomMap = function (data) {

        var minlat = data.minLatitude;
        var maxlat = data.maxLatitude;
        var minlon = data.minLongitude;
        var maxlon = data.maxLongitude;

        if ((minlat === -1) && (maxlat == -1)) {
            centerMap();
            return;
        }

        // Center around the middle of the points
        var centerlon = (maxlon + minlon) / 2;
        var centerlat = (maxlat + minlat) / 2;

        var bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(minlat, minlon),
            new google.maps.LatLng(maxlat, maxlon));
        map.setCenter(new google.maps.LatLng(centerlat, centerlon));
        map.fitBounds(bounds);
    };
    /*
    --------------------- Return part ---------------------
    */
    return {
        init: function (google) {

            var mapElement, mapOptions;

            chart = new google.visualization.ColumnChart(document.getElementById('chart_div'));
            elevationService = new google.maps.ElevationService();
            // create map
            mapOptions = {
                zoom: MapConstants.DEFAULT_ZOOM,
                mapTypeId: 'terrain'
            };
            mapElement = document.getElementById('map');
            map = new google.maps.Map(mapElement, mapOptions);

            // find position
            findPosition();
            document.getElementById('chart_div').addEventListener("mouseout", clearMouseMarker);
        },

        showOnMap: function (tracks, data) {
            centerAndZoomMap(data);
            for (var i = 0; i < tracks.length; i++) {
                showTrack(tracks[i], data);
            }
            if (data.gpxs.length > 0 && data.gpxs[0].tracks.length > 0) {
                showElevation(data.gpxs[0].tracks[0]);
            }
        },


    }

})();

/*
  --------------------------------------------------------
  ---------------------- UIController --------------------
  --------------------------------------------------------
*/
var UIController = (function () {


    /*
    --------------------- Return part ---------------------
    */
    return {
        selectFiles: function (evt) {
            var element = evt.target;
            files = [];
            for (var i = 0; i < element.files.length; i++) {
                files.push(element.files[i]);
            }
            return files;
        },

        showDragError: function (message) {
            var element;
            element = document.getElementById('drop_zone_error');
            element.innerHTML = message;
            // Add the "show" class to DIV
            element.className = "show";

            setTimeout(function () {
                element.className = element.className.replace("show", "");
            }, 3000);
        },

        init: function () {
            document.getElementById("divDistance").style.display = 'none';
            document.getElementById("chart_div").style.display = 'none';
        }
    }

})();


/*
  --------------------------------------------------------
  ---------------------- dataController ------------------
  --------------------------------------------------------
  Data manipulation - reader for GPX files
*/
var dataController = (function () {

    var data = {
        gpxs: [],
        minLatitude: -1,
        maxLatitude: -1,
        minLongitude: -1,
        maxLongitude: -1
    }

    // Gpx file can contain more tracks and routes
    var Gpx = function (id, name, filename) {
        this.id = id;
        this.name = name;
        this.filename = filename;
        this.tracks = new Array();
    };

    // gpx file
    Gpx.prototype.addTrack = function (track) {
        this.tracks.push(track);
    };


    // track with points
    var Track = function (id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.points = new Array();
        this.latlngArray = [];
        this.polyline = null;
        this.isPloted = false;
    };

    // point with latitude and longitude
    var Point = function (lat, long) {
        this.lat = lat;
        this.long = long;
    };

    Track.prototype.addPoint = function (point) {
        this.points.push(point);
    };

    var filterGpxFiles = function (files) {
        var gpxFiles = [];
        for (var i = 0; i < files.length; i++) {
            if (files[i].name.split('.').pop().toLowerCase() === 'gpx') {
                gpxFiles.push(files[i]);
            }
        }
        return gpxFiles;
    };

    var getTrackCount = function () {
        var counter = 0;
        for (var i = 0; i < data.gpxs.length; i++) {
            counter += data.gpxs[i].tracks.length;
        }
        return counter;
    };

    // calculate coordinate to center and zoom tracks
    var calculateBounds = function () {
        var track, gpx;
        var minlat = 999999999;
        var maxlat = -99999999999;
        var minlon = 999999999;
        var maxlon = -99999999999;
        if (data.gpxs.length == 0) {
            data.minLatitude = -1;
            data.maxLatitude = -1;
            data.minLongitude = -1;
            data.maxLongitude = -1;
            return;
        }

        for (var i = 0; i < data.gpxs.length; i++) {
            gpx = data.gpxs[i];
            for (var j = 0; j < gpx.tracks.length; j++) {
                track = gpx.tracks[j];
                for (var k = 1; k < track.points.length; k++) {
                    var lat = parseFloat(track.points[k].lat);
                    var lon = parseFloat(track.points[k].long);
                    if (lon < minlon) minlon = lon;
                    if (lon > maxlon) maxlon = lon;
                    if (lat < minlat) minlat = lat;
                    if (lat > maxlat) maxlat = lat;
                }
            }
        }
        data.minLatitude = minlat;
        data.maxLatitude = maxlat;
        data.minLongitude = minlon;
        data.maxLongitude = maxlon;
    };

    var readTrack = function (xmlTrack, gpx) {
        var name, id, color, track, xmlPoints;

        name = $(xmlTrack).find("name").text();
        id = getTrackCount();
        if (!name) {
            name = 'track' + (id + 1);
        }

        // track color from gsx file
        color = $(xmlTrack).find("color").text();
        track = new Track(id, name, color);

        var xmlPoints = $(xmlTrack).find("trkpt");
        for (var i = 0; i < xmlPoints.length; i++) {
            // have to be wrapped by $() to use attr fuction of jquery
            var lat = $(xmlPoints[i]).attr('lat');
            var lon = $(xmlPoints[i]).attr('lon');
            point = new Point(lat, lon);
            track.addPoint(point);
        }
        // register tracks if there are some points
        if (track.points.length > 0) {
            gpx.addTrack(track);
        }
    };

    var readGpxFiles = function (file, callBackShowOnMap) {
        var reader;

        reader = new FileReader();
        reader.readAsText(file);
        // callback function is called when the file is readed
        reader.onloadend = function () {
            var xmlData, tracks, track, name;
            xmlData = $(reader.result);
            name = $(xmlData).find("metadata").find('name').text();
            if (!name) {
                name = file.name;
            }
            gpx = new Gpx(data.gpxs.length + 1, name, file.name);
            data.gpxs.push(gpx);

            tracks = $(xmlData).find("trk");
            for (var i = 0; i < tracks.length; i++) {
                readTrack(tracks[i], gpx);
            }
            if (tracks.length > 0) {
                // after the reading odf file is done the callback
                // function is called
                calculateBounds();
            }
            callBackShowOnMap(gpx.tracks, data);
        };
    };

    /*
    --------------------- Return part ---------------------
    */
    return {
        parseFiles: function (files, callBackShowOnMap) {
            var gpxFiles;
            // 1. filter only gpx files 
            gpxFiles = filterGpxFiles(files);

            if (gpxFiles.length > 0) {
                // Checks whether the browser supports HTML5  
                if (typeof (FileReader) != "undefined") {
                    // read GPX files as XML
                    for (var i = 0; i < gpxFiles.length; i++) {
                        readGpxFiles(files[i], callBackShowOnMap);
                    }
                } else {
                    alert("Sorry! Your browser does not support HTML5!");
                }
            }
            return gpxFiles.length;
        },

        getData: function () {
            return data;
        },

    }

})();


/*
  --------------------------------------------------------
  ---------------------- mainController ------------------
  --------------------------------------------------------
  Data manipulation - reader for GPX files
*/
var mainController = (function (dataCtrl, UICtrl, mapCtrl) {

    /*
    Prepare listeners for drag and drop
    */
    var setupEventListeners = function () {
        // Setup the listeners.
        document.getElementById('gpxFile').addEventListener("change", buttonFilesClick, false);
    };

    var buttonFilesClick = function (evt) {
        var selectedFiles = UICtrl.selectFiles(evt);
        if (dataCtrl.parseFiles(files, showOnMap) === 0) {
            UICtrl.showDragError('No gpx file selected...');
        }
    };

    var showOnMap = function (tracks, data) {
        if (tracks.length > 0) {
            mapCtrl.showOnMap(tracks, data);
        } else {
            UICtrl.showDragError("No track found in gpx...");
        }
    };
    /*
    --------------------- Return part ---------------------
    */
    return {

        init: function (google) {
            setupEventListeners();
            // init google map and position
            mapCtrl.init(google);
        }
    }

})(dataController, UIController, MapController);


var initApp = function () {
    mainController.init(google);
};
