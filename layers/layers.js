var wms_layers = [];


        var lyr_ESRISatellite_0 = new ol.layer.Tile({
            'title': 'ESRI Satellite',
            'type': 'base',
            'opacity': 1.000000,


            source: new ol.source.XYZ({
    attributions: ' ',
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            })
        });
var lyr_LOSmmyr_1 = new ol.layer.Image({
                            opacity: 1,
                            title: "LOS (mm/yr)",


                            source: new ol.source.ImageStatic({
                               url: "./layers/LOSmmyr_1.png",
    attributions: ' ',
                                projection: 'EPSG:3857',
                                alwaysInRange: true,
                                imageExtent: [-17384504.787457, 2137485.973006, -17222424.315480, 2321987.420445]
                            })
                        });

lyr_ESRISatellite_0.setVisible(true);lyr_LOSmmyr_1.setVisible(true);
var layersList = [lyr_ESRISatellite_0,lyr_LOSmmyr_1];
