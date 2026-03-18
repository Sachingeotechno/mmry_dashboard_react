const fs = require('fs');
const d3Geo = require('d3-geo');

const geojson = JSON.parse(fs.readFileSync('public/bihar.geojson', 'utf8'));

const boundsMap = {};
geojson.features.forEach(feat => {
    const name = feat.properties.Dist_Name || feat.properties.name || "";
    // using a default projection to get relative bounds
    const projection = d3Geo.geoMercator().fitSize([400, 400], feat);
    boundsMap[name.toLowerCase()] = {
        scale: projection.scale(),
        center: projection.invert([200, 200]) // Center of the 400x400 box
    };
});
console.log(JSON.stringify(boundsMap, null, 2));
