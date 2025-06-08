/**
 * Utility to import texture assets properly with webpack
 */

// Import all the assets
import mercury from '../assets/mercury.jpg';
import venus from '../assets/venus.jpg';
import mars from '../assets/mars.jpg';
import jupiter from '../assets/jupiter.jpg';
import saturn from '../assets/saturn.jpg';
import uranus from '../assets/uranus.jpg';
import neptune from '../assets/neptune.jpg';
import sun from '../assets/sun.jpg';
import moon from '../assets/moon.jpg';

// Export a mapping of planet names to their texture paths
export const textures = {
  mercury,
  venus,
  mars,
  jupiter,
  saturn,
  uranus,
  neptune,
  sun,
  moon
};

// Function to get a texture path by planet name
export const getTexturePath = (name) => {
  return textures[name.toLowerCase()];
};

// Export default for convenience
export default textures;
