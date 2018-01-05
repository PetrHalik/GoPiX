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

    }

})();


/*
  --------------------------------------------------------
  ---------------------- dataController ------------------
  --------------------------------------------------------
  Data manipulation - reader for GPX files
*/
var dataController = (function () {

    /*
    --------------------- Return part ---------------------
    */
    return {

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
    --------------------- Return part ---------------------
    */
    return {

        init: function (google) {

            // init google map and position
            mapCtrl.init(google);

        }
    }

})(dataController, UIController, MapController);


var initApp = function () {
    mainController.init(google);
};
