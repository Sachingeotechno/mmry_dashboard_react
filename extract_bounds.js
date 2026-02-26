import fs from 'fs';
import * as d3Geo from 'd3-geo';

const geojson = JSON.parse(fs.readFileSync('public/bihar.geojson', 'utf8'));

const boundsMap = {};
geojson.features.forEach(feat => {
    const name = feat.properties.Dist_Name || feat.properties.name || "";
    const projection = d3Geo.geoMercator().fitSize([400, 400], feat);
    boundsMap[name.toLowerCase()] = {
        scale: projection.scale(),
        center: projection.invert([200, 200])
    };
});

fs.writeFileSync('src/district_bounds.json', JSON.stringify(boundsMap, null, 2));
console.log('Saved src/district_bounds.json');
