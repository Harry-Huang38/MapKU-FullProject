/*
* @File: map.js
* @Authors: EECS 448 Team 14 - Fall 2020
* @Breif: This file creates the Google Map and lets the user create
*        routes to hand to the Google Directions API
*/

/*
* @post: Google Map is posted on screen and all UI elements are set up
*/
function initMap() {
    //The directionsService is what you get the directions from
    const directionsService = new google.maps.DirectionsService();
    //The directionsRenderer is what blits the route onto the Google Map
    const directionsRenderer = new google.maps.DirectionsRenderer();

    //Create a new Google Map with the center around KU Campus
    const map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 38.957235, lng: -95.248962 },
        zoom: 16,
        disableDefaultUI: true, //Disable buttons for terrain view, street view, etc.
    });
    //create an empty route to controll API input
    let myRoute = new Route();
    
    directionsRenderer.setMap(map); //Tell the directionsRenderer where to blit the route

    let searchBox = document.getElementById("searchBox");
    //Create a new places.Autocomplete instance and add it to the search box
    let autocomplete = new google.maps.places.Autocomplete(searchBox);
    //make the "soft" bounds the current view of the map
    autocomplete.bindTo('bounds', map);
    //set the bounds to strict and only show establishments
    autocomplete.setOptions({ strictBounds: true, types: ['establishment'] });

    //Loop through all of the buildings and create markers with their information
	for (let i = 0; i < beaches.length; i++) {
		const beach = beaches[i];	
		addMarker(beach[1], beach[2], beach[0], beach[3], map, myRoute);
	}

    //Debug tool: whenever you click on the map, it logs the lng and lat to console
    map.addListener("click" , (mouseEvent) => {
        console.log(mouseEvent.latLng.lat(), mouseEvent.latLng.lng());
    });
    setupButtonListeners(directionsService, directionsRenderer, myRoute);
}

/*
* @post: A marker is added to the Google Map
* @param: lati: latitude of marker, lngi: longitude of marker, title: HTML for marker title, name: string of place name
*/
function addMarker(lati, lngi, title, name, map, route){
    //Create a new marker with the parameters
    var markerImage = new google.maps.MarkerImage('image/Jayhawk.png',
                new google.maps.Size(100, 100),
                new google.maps.Point(0, 0),
                new google.maps.Point(15, 15));

    let marker = new google.maps.Marker({
        animation: google.maps.Animation.DROP,
        position: {lat: lati, lng: lngi},
        map,
        title: name,
        icon: markerImage
    });
    marker.setOpacity(.4); //Make the marker partially see-through
    
    //When you mouse over the marker, make it solid
    marker.addListener('mouseover', function() { 
        marker.setOpacity(1);
    });
    //When the mouse leaves the marker, set it back to see-through
    marker.addListener('mouseout', function() { 
        marker.setOpacity(0.4);
    });
    
    //Create a new infowindow with the title parameter's HTML
    const infowindow = new google.maps.InfoWindow({ 
        content: title
    });
    //When you click on a marker, open up the infowindow
    marker.addListener("click", () => { 
        infowindow.open(map, marker);
    });
    //When you doubleclick a marker, add the place to the route and close the infowindow
    marker.addListener("dblclick", () => { 
        route.addToRoute(name, true);
        addPlaceToHTML(name, false);
        infowindow.close();
    })
}

/*
* @param: directionsService: google.maps.directionsService to calculate route
*         directionsRenderer: google.maps.directionsRenderer to blits directions to the map
*         myRoute: the route to use in the API calls
* @post: All buttons are set up to do their intended functionality
*/
function setupButtonListeners(directionsService, directionsRenderer, myRoute){
    //Intermediate function for mapping the route
    const calculateDirections = function (route){
        mapRoute(directionsService, directionsRenderer, route);
    }

    //Set up the add to route button
    document.getElementById("addToRoute").addEventListener("click", () => {
        let searchInfo = document.getElementById("searchBox").value;
        if (searchInfo.length > 0){
            myRoute.addToRoute(searchInfo, true);
            addPlaceToHTML(searchInfo, false);
        }
    });
    //Set up the calculate route button
    document.getElementById("calculateRoute").addEventListener("click", () => {
        if (myRoute.isValidRoute()) calculateDirections(myRoute);
        else alert("Route must have at least two points");
        document.getElementById("searchBox").value = "";
    });
    //Set up the clear route button
    document.getElementById("clearRoute").addEventListener("click", () => {
        location.reload(); //Just reload the page :)
    });

    //Creates a button to add the user's current location to the route list
    document.getElementById("addGPS").addEventListener("click", () => {
        if (navigator.geolocation){ //If the user allows the geolocation services
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const currentPos = {  
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    }; 
                    
                    console.log(currentPos);
                    myRoute.addToRoute(currentPos.lat.toString() + ", " + currentPos.lng.toString(), false);
                    addPlaceToHTML("", true);
                },
                (error) => {
                    alert(error.message);
                    console.log(error.message);
                }
            )
        }
        else{
            console.log("Geolocation services were not allowed.");
            alert("Geolocation services were not allowed.");
        }
    });
}

/*
* @pre: directionsService is google.maps.DirectionsService, directionsRenderer is google.maps.directionsRenderer, route is Route
* @post: Gets and posts the directions for the route to the screen
* @param: directionsService: to get direction info, directionsRenderer: to blit directions to Google Map, route: data to hand to directionsService
*/
function mapRoute(directionsService, directionsRenderer, route){
    //Tell the directionsService to route a trip from route.origin including all route.wayps to route.destination
    directionsService.route(
        {
            origin: {
                query: route.origin,
            },
            destination: {
                query: route.destination,
            },
            waypoints: route.wayps,
            travelMode: google.maps.TravelMode.WALKING,
        },
        //Response is the large object that the directionsService hands back to us, status is the status of the call
        (response, status) => { 
            if (status === "OK"){ //If no errors occured
                console.log(response); //Debug: log the response to console

                //Get the HTML element that we put the directions into
                let dirtext = document.getElementById("directionInfo");
                dirtext.innerHTML = ""; //Clear it before we add

                //Loop through all points in the route
                for (let i = 0; i < response.routes[0].legs.length; i++){
                    //Blit to the screen the points, the distance of this leg, and the duration of this leg
                    dirtext.innerHTML += "<u><b>Point " + (i+1) + " to point " + (i+2) + ":</b></u></br>" +
                    "Distance: " + response.routes[0].legs[i].distance.text  + "</br>" + 
                    "Duration: " + response.routes[0].legs[i].duration.text  + "</br>";

                    //Loop through all steps in the current part of the route, I.E. the directions info for this part
                    for (let j = 0; j < response.routes[0].legs[i].steps.length; j++){
                        //Add the info to our HTML element
                        dirtext.innerHTML += response.routes[0].legs[i].steps[j].instructions + " in " + response.routes[0].legs[i].steps[j].distance.text + "<br>";
                    }
                }
                //Tell the directionsRenderer to blit the route to the Google Map
                directionsRenderer.setDirections(response);
                //Debug: log to console the origin, destination, and say it was successful
                console.log("Successfully routed from", route.origin, "to", route.destination);
            }
            //If there WAS an error:
            else{ 
                //Debug: log the error to the console
                console.log("Directions error: " + status);
                //Alert the user that there has been an error
                alert("There was an error processing the directions.");
            }
        }
    );
}

/*
* @param item, the string to be added, isLocationServices, self-explainatory
* @post item is added to the route list in the HTML, and if it is location services it says "Current Location"
*/
function addPlaceToHTML(item, isLocationServices){
    let rtlist = document.getElementById("routeList");
    let li = document.createElement("li");
    if (!isLocationServices) {
        li.setAttribute('id', item);
        li.appendChild(document.createTextNode(item));
    }
    else{
        li.setAttribute('id', "Current Location");
        li.appendChild(document.createTextNode("Current Location"));
    }
    rtlist.appendChild(li);
}