var ZOMATO_API_KEY = "42c836c550d776cf1e0c2cc7fa24283a";
var FETCH_COUNT = 10;
var map;
//get_res_by_location("bangalore", "", "", 10);
$(".search").submit(function(e) {
    //get_res_by_location($(this).find("#search-loc").val(), "", "", FETCH_COUNT);
    e.preventDefault();
})

function initAutocomplete() {
    map = new google.maps.Map(document.getElementById('map'), {center: {lat: 12.910286, lng: 77.645022}, zoom: 13, mapTypeId: 'roadmap'});
    var infoWindow = new google.maps.InfoWindow({map: map});

    // Try HTML5 geolocation.
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            infoWindow.setPosition(pos);
            //infoWindow.setContent('Location found.');
            infoWindow.setContent('Your Location');
            var geocoder = new google.maps.Geocoder
            geocoder.geocode({'latLng': new google.maps.LatLng(position.coords.latitude, position.coords.longitude)}, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    var place = results[3]; // APPROXIMATE 
                    $("#search-loc").val(results[3]['formatted_address'])
                    $("#res-list").empty();
                    //console.log(place.geometry);
                    var location = place.geometry.location;
                    get_res_by_location(place['formatted_address'], location.lat(), location.lng(), FETCH_COUNT);
                }
            });

            map.setCenter(pos);
        }, function() {
            handleLocationError(true, infoWindow, map.getCenter());
        });
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
    }

    var input = document.getElementById('search-loc');
    var searchBox = new google.maps.places.SearchBox(input);
    map.addListener('bounds_changed', function() {
        searchBox.setBounds(map.getBounds());
    });

    var markers = [];
    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();
        if (places.length == 0) {
            return;
        }

        markers.forEach(function(marker) {
            marker.setMap(null);
        });
        markers = [];//custom
        // For each place, get the icon, name and location.
        var bounds = new google.maps.LatLngBounds();
        places.forEach(function(place) {
            if (!place.geometry) {
                console.log("Returned place contains no geometry");
                return;
            }
            var icon = {
                url: place.icon,
                size: new google.maps.Size(71, 71),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(17, 34),
                scaledSize: new google.maps.Size(25, 25)
            };

            // Create a marker for each place.
            markers.push(new google.maps.Marker({
                map: map,
                icon: icon,
                title: place.name,
                position: place.geometry.location
            }));

            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);

            } else {
                bounds.extend(place.geometry.location);
            }
            var location = place.geometry.location;
            $("#res-list").empty();
            get_res_by_location(place.name, location.lat(), location.lng(), FETCH_COUNT);
        });
        map.fitBounds(bounds);
    });

}
function get_res_by_location(location, lat, lon, count) {
    console.log(location);
    $.ajax({
        type: "POST",
        url: "https://developers.zomato.com/api/v2.1/locations?query=" + location + "&lat=" + lat + "&lon=" + lon + "&count" + count,
        headers: {'user-key': ZOMATO_API_KEY},
        dataType: "json",
        success: function(json) {
            if (json.status == "success") {
                if (parseInt(json.location_suggestions.length) > 0) {
                    var entity_id = json.location_suggestions[0].entity_id;
                    var entity_type = json.location_suggestions[0].entity_type;
                    get_res_by_entity(entity_id, entity_type);
                    $("#res-list").addClass("row")
                    $("#map").removeClass("hide")
                } else {
                    var div = $("<div />").html("No Restaurant found").addClass("col-md-12 alert alert-info")
                    $("#res-list").removeClass("row").html(div)
                    $("#map").addClass("hide")
                }
            }

        }
    });
}

function get_res_by_entity(entity_id, entity_type) {
    $.ajax({
        type: "GET",
        dataType: "json",
        url: "https://developers.zomato.com/api/v2.1/location_details?entity_id=" + entity_id + "&entity_type=" + entity_type,
        headers: {"user-key": ZOMATO_API_KEY},
        success: function(json) {
            if (json.best_rated_restaurant.length > 0) {
                display_res(json.best_rated_restaurant);
            } else {
                $("#res-list").html("No Restaurant found")
            }
        }
    });
}

function display_res(res) {
    var image = {url: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png', size: new google.maps.Size(20, 32), origin: new google.maps.Point(0, 0), anchor: new google.maps.Point(0, 32)};
    var shape = {coords: [1, 1, 1, 20, 18, 20, 18, 1], type: 'poly'};
    var zIndex = res.length;

    $.each(res, function(k, v) {
        var c = $(".template").find(".res-item").clone();
        c.find(".res-title").html(v.restaurant.name)
        if (v.restaurant.thumb != "")
            c.find(".res-thumb").css('background-image', 'url(' + v.restaurant.thumb + ')').css("background-size", "cover");
        c.find(".res-city").html(v.restaurant.location.city);
        c.find(".res-address").html(v.restaurant.location.address);
        if (parseInt(v.restaurant.has_online_delivery) == 1)
            c.find(".has-online-delivery").find("i").removeClass("glyphicon-remove-circle text-danger").addClass("glyphicon-ok-circle text-success")
        else
            c.find(".has-online-delivery").find("i").removeClass("glyphicon-ok-circle text-success").addClass("glyphicon-remove-circle text-danger")

        c.find(".res-user-rating .aggregate_rating").html(v.restaurant.user_rating.aggregate_rating).css("background-color", "#" + v.restaurant.user_rating.rating_color);
        ;
        //c.find(".res-user-rating .rating_text").html(v.restaurant.user_rating.aggregate_rating);
        c.find(".res-user-rating .votes").html(v.restaurant.user_rating.votes + " Votes");

        c.find(".cuisines").html(v.restaurant.cuisines);
        c.find(".cost-for-two").html(v.restaurant.average_cost_for_two);

        c.find(".price_range").html(v.restaurant.price_range);
        c.find(".booking_url").attr("href", v.restaurant.url);
        $("#res-list").append(c.html())

        // Handle Marker
        var marker = new google.maps.Marker({
            position: {lat: parseFloat(v.restaurant.location.latitude), lng: parseFloat(v.restaurant.location.longitude)},
            map: map,
            icon: image,
            shape: shape,
            title: v.restaurant.name,
            zIndex: zIndex
        });
        zIndex--;
    })
}