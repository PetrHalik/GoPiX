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
    }

    // variables

    var map = null;
    var currentLatitude = MapConstants.DEFAULT_LATITUDE;
    var currentLongitude = MapConstants.DEFAULT_LONGITUDE;


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
    --------------------- Return part ---------------------
    */
    return {
        init: function (google) {

            var mapElement, mapOptions;

            // create map
            mapOptions = {
                zoom: MapConstants.DEFAULT_ZOOM,
                mapTypeId: 'terrain'
            };
            mapElement = document.getElementById('map');
            map = new google.maps.Map(mapElement, mapOptions);

            // find position
            findPosition();
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
        gpxs: []
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

    var readGpxFiles = function (file) {
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
        };
    };

    /*
    --------------------- Return part ---------------------
    */
    return {
        parseFiles: function (files) {
            var gpxFiles;
            // 1. filter only gpx files 
            gpxFiles = filterGpxFiles(files);

            if (gpxFiles.length > 0) {
                // Checks whether the browser supports HTML5  
                if (typeof (FileReader) != "undefined") {
                    // read GPX files as XML
                    for (var i = 0; i < gpxFiles.length; i++) {
                        readGpxFiles(files[i]);
                    }
                } else {
                    alert("Sorry! Your browser does not support HTML5!");
                }
            }
            console.log(data);
            return gpxFiles.length;
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
        if (dataCtrl.parseFiles(selectedFiles) === 0) {
            UICtrl.showDragError('No gpx file selected...');
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
