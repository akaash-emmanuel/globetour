function createHealthAssistant() {
  // Calculate optimal sleep windows based on orbit
  const sleepSchedule = calculateOptimalSleepWindows();
  
  // Plan exercise routines that coordinate with orbital mechanics
  const exerciseSchedule = planExerciseWithOrbit();
  
  // Monitor cumulative radiation exposure
  trackRadiationExposure();
  
  // Create circadian rhythm adjustment visualizations
  addCircadianRhythmTools();
  
  // Set up alerts for upcoming sleep periods
  setupHealthAlerts(sleepSchedule, exerciseSchedule);
}
