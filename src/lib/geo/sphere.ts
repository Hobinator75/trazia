export interface XYZ {
  x: number;
  y: number;
  z: number;
}

const DEG_TO_RAD = Math.PI / 180;

// Maps (lat, lng) to a point on a sphere of the given radius using the
// orientation of THREE.SphereGeometry's default UV mapping. With this
// convention, a sphere textured with an equirectangular daymap (lng=-180
// at the left edge, lng=+180 at the right edge, lat=+90 at the top edge)
// will line up with the latitude/longitude values fed in here.
//
//   - Latitude  +90° → +Y (north pole)
//   - Latitude  −90° → −Y (south pole)
//   - 0° lat /   0° lng → +X
//   - 0° lat / +90° lng → −Z
export function latLngToVec3(lat: number, lng: number, radius = 1): XYZ {
  const phi = (90 - lat) * DEG_TO_RAD;
  const theta = (lng + 180) * DEG_TO_RAD;
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}
