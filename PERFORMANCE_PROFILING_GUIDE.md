# Performance Profiling Guide for Gravitas Simulation

## Overview
This guide walks through profiling the black hole simulation to identify performance bottlenecks and implement optimizations.

## Step 1: Browser Performance Profiling

### Setup for Profiling
1. Open the simulation in Chrome/Firefox (Chrome recommended for detailed profiling)
2. Open Developer Tools (F12)
3. Go to the Performance tab
4. Configure settings:
   - Enable "Screenshots" to see visual changes
   - Enable "Web Vitals" for user experience metrics
   - Set CPU throttling to "4x slowdown" to amplify bottlenecks

### Recording Performance
1. Start with a complex scenario (e.g., "Binary BH" with many objects)
2. Click "Record" in Performance tab
3. Let the simulation run for 5-10 seconds
4. Stop recording and analyze the flame graph

### What to Look For
- **Long Tasks**: Tasks taking >16ms (causes frame drops)
- **Frequent GC**: Garbage collection spikes indicating memory pressure
- **Main Thread Blocking**: JavaScript execution blocking rendering
- **Canvas Operations**: Expensive draw calls in the rendering pipeline

## Step 2: Expected Bottlenecks

Based on code analysis, the main performance bottlenecks are:

### Rendering Bottlenecks (js/render.js)
1. **Trail Rendering** (lines 85-105):
   - Multiple canvas operations per object
   - Changing globalAlpha repeatedly
   - No culling of off-screen trails

2. **Object Drawing** (lines 107-119):
   - Individual draw calls for each object
   - No batching of similar objects
   - Complex gradient calculations in object draw methods

3. **DOM Updates** (lines 135-148):
   - innerHTML updates every frame
   - String concatenation and formatting

### Physics Bottlenecks (js/physics.js)
1. **Gravity Calculations** (lines 138-153):
   - O(n²) complexity for mutual gravity
   - Redundant distance calculations
   - No spatial partitioning

2. **Object Updates** (lines 175-189):
   - Array spread operations creating new arrays
   - Multiple array iterations
   - Filter operations creating new arrays

3. **Collision Detection** (lines 1567-1623):
   - O(n²) brute force collision checking
   - No broad-phase collision detection

## Step 3: Optimization Implementation

### Rendering Optimizations

#### 1. Trail Rendering Optimization
- Batch trail rendering by color
- Use single path for multiple trail segments
- Implement trail culling for off-screen objects

#### 2. Object Drawing Optimization
- Implement object pooling for similar objects
- Batch drawing operations by object type
- Cache expensive calculations (gradients, colors)

#### 3. DOM Update Optimization
- Throttle overlay updates to every 5-10 frames
- Use textContent instead of innerHTML
- Cache formatted strings

### Physics Optimizations

#### 1. Gravity Calculation Optimization
- Cache distance calculations
- Use spatial partitioning for large object counts
- Implement force approximation for distant objects

#### 2. Object Update Optimization
- Avoid array spread operations
- Use for loops instead of forEach where possible
- Implement dirty flagging for unchanged objects

#### 3. Memory Management
- Implement object pooling for particles
- Reuse temporary objects
- Reduce garbage collection pressure

## Step 4: Profiling Results Analysis

### Key Metrics to Track
- **FPS**: Target 60 FPS (16.67ms per frame)
- **Frame Time**: Total time per frame
- **JavaScript Execution Time**: Time spent in JS vs rendering
- **Memory Usage**: Heap size and GC frequency
- **Canvas Operations**: Number of draw calls per frame

### Performance Targets
- Frame time: <16ms for 60 FPS
- JavaScript execution: <8ms per frame
- Memory growth: <1MB per minute
- GC frequency: <1 per second

## Step 5: Verification

After implementing optimizations:
1. Re-run performance profiling with same scenario
2. Compare before/after metrics
3. Test with different object counts
4. Verify visual quality is maintained
5. Test on lower-end devices

## Common Performance Issues

### Issue 1: Frame Rate Drops
- **Cause**: JavaScript execution taking >16ms
- **Solution**: Distribute work across multiple frames
- **Implementation**: Time-sliced physics updates

### Issue 2: Memory Leaks
- **Cause**: Objects not being garbage collected
- **Solution**: Proper cleanup and object pooling
- **Implementation**: Explicit cleanup in object lifecycle

### Issue 3: Canvas Performance
- **Cause**: Too many draw calls or expensive operations
- **Solution**: Batch operations and optimize draw methods
- **Implementation**: Render queuing and batching

## Performance Monitoring

### Runtime Performance Monitoring
```javascript
// Add to gameLoop for continuous monitoring
const frameStart = performance.now();
// ... simulation logic ...
const frameTime = performance.now() - frameStart;
if (frameTime > 16.67) {
  console.warn(`Slow frame: ${frameTime.toFixed(2)}ms`);
}
```

### Memory Monitoring
```javascript
// Check memory usage periodically
if (performance.memory) {
  const memInfo = performance.memory;
  console.log(`Memory: ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
}
```

## Tools and Resources

### Browser DevTools
- **Chrome DevTools**: Best for detailed performance analysis
- **Firefox DevTools**: Good for memory profiling
- **Safari DevTools**: Useful for iOS performance testing

### Performance APIs
- `performance.now()`: High-resolution timing
- `performance.memory`: Memory usage (Chrome only)
- `performance.mark()`: Custom performance markers

### Profiling Extensions
- **React Developer Tools**: For React-based UIs
- **Vue DevTools**: For Vue-based UIs
- **Performance Observer**: For automated performance monitoring

## Next Steps

1. Follow the profiling steps above
2. Implement the optimizations in order of impact
3. Test thoroughly on different devices
4. Monitor production performance
5. Iterate based on user feedback

This guide provides a systematic approach to identifying and fixing performance bottlenecks in the Gravitas simulation. 