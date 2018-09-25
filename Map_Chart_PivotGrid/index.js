var DemoApp = angular.module('DemoApp', ['dx']);

DemoApp.controller('DemoController', function DemoController($scope, $http) {

	var table_click = false;
	var odataUrl = "/ingatlanokodata/ingatlanok.xsodata/IngatlanokOData?$format=json&$top=60000"; //OData url
	$http.get(odataUrl)
		.then(function (response) {
			$scope.regiok = response.data.d.results; // Getting OData
			$scope.dataLoaded = true; //chart and the pivot grid is created when this becomes true, because of /ng-if="dataLoaded" / in index.html
			$scope.isFirstLevel = true;

			//chart options
			$scope.chartOptions = {
				commonSeriesSettings: {
					type: "bar"
				},
				tooltip: {
					enabled: true,
					customizeTooltip: function (args) {
						var valueText = (args.seriesName.indexOf("Total") != -1) ?
							Globalize.formatCurrency(args.originalValue,
								"USD", {
									maximumFractionDigits: 0
								}) :
							args.originalValue;
						return {
							html: args.seriesName + "<div class='currency'>" + valueText + "</div>"
						};
					}
				},
				onPointClick: function (e) {
					var series_words = e.target.data.series.split(' ');
					console.log(series_words.length);
					var arr = [];
					if (series_words.length <= 4) {
						arr.push(series_words[0] + " " + series_words[1]);
						map_display_region(series_words[0] + " " + series_words[1]);
					} else {
						arr.push(series_words[0] + " " + series_words[1]);
						arr.push(series_words[3] + " " + series_words[4]);
						map_display_county(series_words[3] + " " + series_words[4])
					}

					console.log(arr);
					$scope.pivotGridOptions.dataSource.expandHeaderItem("row", arr);
				},
				size: {
					height: 320
				},
				adaptiveLayout: {
					width: 450
				},
				onInitialized: function (e) {
					$scope.chart = e.component;
				}
			};

			$scope.drillDownDataSource = {};
			$scope.salesPopupVisible = false;
			$scope.salesPopupTitle = "";
			$scope.drillDownDataGrid = {};

			$scope.dataSource = new DevExpress.data.PivotGridDataSource({
				fields: [{
					caption: "Regio",
					width: 120,
					dataField: "REGIO",
					area: "row",
					//sortBySummaryField: "Total"
				}, {
					caption: "Megye",
					dataField: "MEGYE",
					width: 150,
					area: "row"
				}, {
					caption: "Telepules",
					dataField: "TELEPULES",
					width: 150,
					area: "row"
				}, {
					caption: "Mennyiseg",
					dataField: "MENNYISEG",
					dataType: "number",
					summaryType: "sum",
					area: "data"
				}, {
					caption: "Total",
					dataField: "ERTEK_HUF",
					dataType: "number",
					summaryType: "sum",
					format: "currency",
					area: "data"
				}],
				store: $scope.regiok
			});

			//pivot options
			$scope.pivotGridOptions = {
				allowSortingBySummary: true,
				allowFiltering: true,
				allowExpandAll: true,
				allowSorting: true,
				showBorders: true,
				showColumnGrandTotals: false,
				showRowGrandTotals: false,
				showRowTotals: false,
				showColumnTotals: false,
				height: 420,
				fieldChooser: {
					enabled: true //when it is true we can add or remove rows and columns from pivotgrid
				},
				//click event 
				onCellClick: function (e) { //clicking on Data type cell
					if (e.area == "data") {
						var pivotGridDataSource = e.component.getDataSource(),
							rowPathLength = e.cell.rowPath.length,
							rowPathName = e.cell.rowPath[rowPathLength - 1],
							popupTitle = (rowPathName ? rowPathName : "Total") + " Drill Down Data";

						$scope.drillDownDataSource = pivotGridDataSource.createDrillDownDataSource(e.cell);
						$scope.salesPopupTitle = popupTitle;
						$scope.salesPopupVisible = true;
					}

					table_click = true;
					map_display_region(e.cell);
					table_click = false;

					var megye = "";

					//switch for table click
					map_display_county(e.cell.text);

					//click on City
					if (e.cell.path.length == 3) {
						address = e.cell.text;
						vm.geocoder.geocode({
							'address': address
						}, function (results) { //finds the clicked city on map
							vm.map.setCenter(results[0].geometry.location);
							vm.map.setZoom(10);
							var marker = new google.maps.Marker({
								map: vm.map,
								position: results[0].geometry.location
							});
							markers.push(marker);
						});
					}
				}, // end click event 
				onInitialized: function (e) {
					e.component.bindChart($scope.chart, {
						dataFieldsDisplayMode: "splitPanes",
						alternateDataFields: true
					});
				},
				scrolling: {
					mode: "virtual"
				},
				dataSource: $scope.dataSource
			};

			$scope.dataGridOptions = {
				bindingOptions: {
					dataSource: {
						dataPath: 'drillDownDataSource',
						deep: false
					}
				},
				onInitialized: function (e) {
					$scope.drillDownDataGrid = e.component;
				},
				width: 560,
				height: 300,
				columns: ['REGIO', 'MEGYE', 'TELEPULES', 'ERTEK_HUF']
			};

			$scope.popupOptions = {
				width: 600,
				height: 400,
				onShown: function () {
					$scope.drillDownDataGrid.updateDimensions();
				},
				bindingOptions: {
					title: "salesPopupTitle",
					visible: "salesPopupVisible"
				}
			};

		});

	var opened_reg = [];
	var numberOfRegions = 7;
	for (var i = 0; i < 7; ++i) {
		opened_reg.push(false);
	}

	var openedCounty = [];
	var numberOfCounty = 20;
	for (var i = 0; i < numberOfCounty; ++i) {
		openedCounty.push(false);
	}

	//regions and counties
	var regions_array = [
		[],
		["HU-BK", "HU-BE", "HU-CS"],
		["HU-BA", "HU-SO", "HU-TO"],
		["HU-ZA", "HU-GE", "HU-VA"],
		["HU-KE", "HU-FE", "HU-VE"],
		["HU-PE", "HU-BU"],
		["HU-HB", "HU-JN", "HU-SZ"],
		["HU-BZ", "HU-HE", "HU-NO"]
	];

	vm = this;
	var address;
	var markers = [];
	// Set the Map Options to be applied when the map is set.
	var mapOptions = {
		zoom: 7,
		scrollwheel: false,
		center: new google.maps.LatLng(47.225242, 19.7457691),
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		mapTypeControl: false,
		mapTypeControlOptions: {
			mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.TERRAIN]
		}
	}

	// Set a blank infoWindow to be used for each to state on click
	/*var infoWindow = new google.maps.InfoWindow({
		content: ""
	});*/

	// Set the map to the element ID and give it the map options to be applied
	vm.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

	// Create the state data layer and load the GeoJson Data
	var stateLayer = new google.maps.Data();
	stateLayer.loadGeoJson(
		'https://raw.githubusercontent.com/zacsipofa/proba/master/HU_COUNTY_ID.json'); //path for GeoJson Data

	vm.geocoder = new google.maps.Geocoder();
	geocoder = new google.maps.Geocoder();

	//click on map
	stateLayer.addListener('click', function (e) {
		/*
		infoWindow.setContent('<div style="line-height:1.00;overflow:hidden;white-space:nowrap;">' +
			e.feature.getProperty('name'));

		var anchor = new google.maps.MVCObject();
		anchor.set("position", e.latLng);
		infoWindow.open(vm.map, anchor);*/

		stateLayer.revertStyle();
		stateLayer.overrideStyle(e.feature, {
			fillColor: '#ff7a08',
		});

		var r = e.feature.getProperty('parent').name + " régió"; //region's name
		var c = e.feature.getProperty('name'); //county's name 

		switch (c) {
		case 'Bács-Kiskun megye':
			openedCounty[0] = true;
			opened_reg[1] = true;
			break;
		case 'Békés megye':
			openedCounty[1] = true;
			opened_reg[1] = true;
			break;
		case 'Csongrád megye':
			openedCounty[2] = true;
			opened_reg[1] = true;
			break;
		case 'Baranya megye':
			openedCounty[3] = true;
			opened_reg[2] = true;
			break;
		case 'Somogy megye':
			openedCounty[4] = true;
			opened_reg[2] = true;
			break;
		case 'Tolna megye':
			openedCounty[5] = true;
			opened_reg[2] = true;
			break;
		case 'Győr-Moson-Sopron megye':
			openedCounty[6] = true;
			opened_reg[3] = true;
			break;
		case 'Vas megye':
			openedCounty[7] = true;
			opened_reg[3] = true;
			break;
		case 'Zala megye':
			openedCounty[8] = true;
			opened_reg[3] = true;
			break;
		case 'Komárom-Esztergom megye':
			openedCounty[9] = true;
			opened_reg[4] = true;
			break;
		case 'Veszprém megye':
			openedCounty[10] = true;
			opened_reg[4] = true;
			break;
		case 'Fejér megye':
			openedCounty[11] = true;
			opened_reg[4] = true;
			break;
		case 'Budapest':
			openedCounty[12] = true;
			opened_reg[5] = true;
			break;
		case 'Pest megye':
			openedCounty[13] = true;
			opened_reg[5] = true;
			break;
		case 'Hajdú-Bihar megye':
			openedCounty[14] = true;
			opened_reg[6] = true;
			break;
		case 'Jász-Nagykun-Szolnok megye':
			openedCounty[15] = true;
			opened_reg[6] = true;
			break;
		case 'Szabolcs-Szatmár-Bereg megye':
			openedCounty[16] = true;
			opened_reg[6] = true;
			break;
		case 'Borsod-Abaúj-Zemplén megye':
			openedCounty[17] = true;
			opened_reg[7] = true;
			break;
		case 'Heves megye':
			openedCounty[18] = true;
			opened_reg[7] = true;
			break;
		case 'Nógrád megye':
			openedCounty[19] = true;
			opened_reg[7] = true;
			break;
		}

		var arr = [];
		var arr2 = []
		arr.push(r);
		$scope.pivotGridOptions.dataSource.expandHeaderItem("row", arr);
		arr2.push(r);
		arr2.push(c);
		$scope.pivotGridOptions.dataSource.expandHeaderItem("row", arr2);
	});

	// Set and apply styling to the stateLayer
	stateLayer.setStyle(function (feature) {
		return {
			fillColor: '#c2c083',
			fillOpacity: 0.6,
			strokeColor: '#737373',
			strokeWeight: 1,
			zIndex: 1
		};
	});

	// Final step here sets the stateLayer GeoJSON data onto the map
	stateLayer.setMap(vm.map);

	function setMapOnAll(map) {
		for (var i = 0; i < markers.length; i++) {
			markers[i].setMap(map);
		}
	}

	function clearMarkers() {
		setMapOnAll(null);
	}

	function showMarkers() {
		setMapOnAll(map);
	}

	// Deletes all markers in the array by removing references to them.
	function deleteMarkers() {
		clearMarkers();
		markers = [];
	}

	//set map back to the centre
	var back_button = document.getElementById('back_but').addEventListener("click", function () {
		vm.map.setCenter(new google.maps.LatLng(47.225242, 19.7457691));
		vm.map.setZoom(7);
		deleteMarkers();
	});

	//expand COUNTIES row
	function map_display_county(switch_param) {
		switch (switch_param) {
		case 'Bács-Kiskun megye':
			county_select("HU-BK", 0, 1);
			break;
		case 'Békés megye':
			county_select("HU-BE", 1, 1);
			break;
		case 'Csongrád megye':
			county_select("HU-CS", 2, 1);
			break;
		case 'Baranya megye':
			county_select("HU-BA", 3, 2);
			break;
		case 'Somogy megye':
			county_select("HU-SO", 4, 2);
			break;
		case 'Tolna megye':
			county_select("HU-TO", 5, 2);
			break;
		case 'Győr-Moson-Sopron megye':
			county_select("HU-GE", 6, 3);
			break;
		case 'Vas megye':
			county_select("HU-VA", 7, 3);
			break;
		case 'Zala megye':
			county_select("HU-ZA", 8, 3);
			break;
		case 'Komárom-Esztergom megye':
			county_select("HU-KE", 9, 4);
			break;
		case 'Veszprém megye':
			county_select("HU-VE", 10, 4);
			break;
		case 'Fejér megye':
			county_select("HU-FE", 11, 4);
			break;
		case 'Budapest':
			county_select("HU-BU", 12, 5);
			break;
		case 'Pest megye':
			county_select("HU-PE", 13, 5);
			break;
		case 'Hajdú-Bihar megye':
			county_select("HU-BH", 14, 6);
			break;
		case 'Jász-Nagykun-Szolnok megye':
			county_select("HU-JN", 15, 6);
			break;
		case 'Szabolcs-Szatmár-Bereg megye':
			county_select("HU-SZ", 16, 6);
			break;
		case 'Borsod-Abaúj-Zemplén megye':
			county_select("HU-BZ", 17, 7);
			break;
		case 'Heves megye':
			county_select("HU-HE", 18, 7);
			break;
		case 'Nógrád megye':
			county_select("HU-NO", 19, 7);
			break;
		case 'Európa':
			vm.map.setCenter(new google.maps.LatLng(48.1003328, 4.156981));
			vm.map.setZoom(3);
			break;
		// click on other countries
		case 'Ázsia':
			vm.map.setCenter(new google.maps.LatLng(23.7097169, 62.3997078));
			vm.map.setZoom(3);
			break;
		case 'Amerika':
			vm.map.setCenter(new google.maps.LatLng(36.2113865, -113.7172988));
			vm.map.setZoom(3);
			break;
		case 'Afrika':
			vm.map.setCenter(new google.maps.LatLng(1.7392774, -16.2743184));
			vm.map.setZoom(3);
			break;
		case 'Ausztrália':
			vm.map.setCenter(new google.maps.LatLng(-25.0269272, 115.1814495));
			vm.map.setZoom(4);
			break;
		case 'Dél-Afrika':
			vm.map.setCenter(new google.maps.LatLng(-34.2968831, 18.2469404));
			vm.map.setZoom(5);
			break;
		}
	}

	//function for clicking on COUNTIES row
	function county_select(megye_par, countyNum, regionNum) { //parameters: 1. County's ID, 2.Index of County in array, 3.Index of Region in array
		if (!openedCounty[countyNum]) { //first click on county
			stateLayer.revertStyle();
			stateLayer.overrideStyle(stateLayer.getFeatureById(megye_par), { //highlighting the selected county
				fillColor: '#ff7a08',
			});
			openedCounty[countyNum] = true;
		} else { //second click on county
			openedCounty[countyNum] = false;
			opened_reg[regionNum] = true;
			var feat = [];
			for (var i = 0; i < regions_array[regionNum].length; ++i) {
				feat.push(stateLayer.getFeatureById(regions_array[regionNum][i]));
			}
			stateLayer.revertStyle();
			feat.forEach(function (element) {
				stateLayer.overrideStyle(element, {
					fillColor: '#ff7a08',
				});
			});

		}
	}
	
	//display clicked region on map
	function map_display_region(switch_param) {
		var region_num = 0;
		var temp_switch_param;
		if (table_click == true) {
			temp_switch_param = switch_param;
			switch_param = switch_param.text;
		}
		switch (switch_param) {
		case 'Dél-Alföld régió':
			region_num = 1;
			break;
		case 'Dél-Dunántúl régió':
			region_num = 2;
			break;
		case 'Nyugat-Dunántúl régió':
			region_num = 3;
			break;
		case 'Közép-Dunántúl régió':
			region_num = 4;
			break;
		case 'Közép-Magyarország régió':
			region_num = 5;
			break;
		case 'Észak-Alföld régió':
			region_num = 6;
			break;
		case 'Észak-Magyarország régió':
			region_num = 7;
			break;
		}

		if (table_click == true) {
			//switch_param = switch_param.text;
			switch_param = temp_switch_param;
		}

		if (!opened_reg[region_num]) {
			opened_reg[region_num] = true;
			var feat = [];
			for (var i = 0; i < regions_array[region_num].length; ++i) {
				feat.push(stateLayer.getFeatureById(regions_array[region_num][i])); //these counties are highlighted
			}
			stateLayer.revertStyle(); // removing highlightings on the map
			feat.forEach(function (element) { //highlighting counties
				stateLayer.overrideStyle(element, {
					fillColor: '#ff7a08',
				});
			});
		} else { //second click on region
			console.log(opened_reg[region_num]);
			if (switch_param.path.length == 1) {
				opened_reg[region_num] = false;
				stateLayer.revertStyle(); //removing highlights
			}
		}
	}

});