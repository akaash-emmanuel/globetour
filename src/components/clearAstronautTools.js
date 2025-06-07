/**
 * Helper module to clear astronaut tools from the globe
 */

/**
 * Clear all astronaut tools visualizations and UI elements
 * @param {Object} globe - The ThreeGlobe instance
 * @param {Object} globeGroup - The group containing the globe 
 */
export const clearAstronautTools = (globe, globeGroup) => {
  // Clear any data visualizations
  if (globe) {
    globe.ringsData([]);
    globe.arcsData([]);
  }

  // Clear custom meshes and objects
  if (globeGroup && globeGroup.children) {
    globeGroup.children = globeGroup.children.filter(child =>
      !child.userData?.isAstronautTool && 
      !child.userData?.isSituationalAwarenessTool &&
      !child.userData?.isMissionPlannerElement
    );
  }

  // Clear any existing interval timers
  if (window.astronautToolIntervals) {
    window.astronautToolIntervals.forEach(interval => clearInterval(interval));
    window.astronautToolIntervals = [];
  }
  
  // Clear mission planner specific intervals
  if (window.missionPlannerIntervals) { 
    window.missionPlannerIntervals.forEach(clearInterval);
    window.missionPlannerIntervals = [];
  }

  // Remove any UI elements
  const elementsToRemove = [
    "verticalButton",
    "astronautToolsMenu",
    "space-sa-hud",
    "ar-toggle-button",
    "mission-planner-panel",
    "loadingIndicator",
    "loaderOverlay"
  ];
  
  elementsToRemove.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.remove();
  });
};
