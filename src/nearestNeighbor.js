import fs from 'fs'; 
const countries = JSON.parse(fs.readFileSync('src/assets/countries.json', 'utf-8'));
const points = countries.map(country => ({
  lat: country.latitude,
  lon: country.longitude,
}));
function nearestNeighborAlgorithm(points) {
  const visited = [];
  const arcs = [];
  let currentPoint = points[0];
  visited.push(currentPoint);
  while (visited.length < points.length) {
    let nearestPoint = null;
    let minDistance = Infinity;

    points.forEach((point) => {
      if (!visited.includes(point)) {
        const distance = getDistance(currentPoint, point);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = point;
        }
      }
    });

    if (nearestPoint) {
      visited.push(nearestPoint);
      arcs.push({
        startLat: currentPoint.lat,
        startLng: currentPoint.lon,
        endLat: nearestPoint.lat,
        endLng: nearestPoint.lon,
      });
      currentPoint = nearestPoint;
    }
  }

  return arcs;
}
function getDistance(point1, point2) {
  const R = 6371; 
  const dLat = (point2.lat - point1.lat) * (Math.PI / 180);
  const dLon = (point2.lon - point1.lon) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * (Math.PI / 180)) *
      Math.cos(point2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; 

  return distance;
}

const arcs = nearestNeighborAlgorithm(points);

try {
  fs.writeFileSync('arcs.json', JSON.stringify(arcs, null, 2), 'utf-8');
  console.log('Arcs data saved to arcs.json');
} catch (err) {
  console.error('Error writing to file:', err);
}
