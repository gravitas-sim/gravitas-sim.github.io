# Energy Tab Feature

## Overview
The Energy tab is a new feature added to the object inspector that displays the selected object's kinetic, potential, and total energy over time. This provides valuable insights into the energy dynamics of celestial objects in the simulation.

## Features

### Energy Calculations
- **Kinetic Energy**: Calculated as 1/2 × mass × velocity²
- **Potential Energy**: Calculated as the gravitational potential energy relative to all other objects in the simulation
- **Total Energy**: Sum of kinetic and potential energy

### Energy Tab Interface
- **Real-time Chart**: Displays energy values over time with three colored lines:
  - Green: Kinetic Energy
  - Orange: Potential Energy  
  - Blue: Total Energy
- **Current Values**: Shows the latest energy values in a grid format
- **Data Points Counter**: Displays how many energy measurements have been collected
- **Export Functionality**: Allows exporting the energy chart as a PNG image

### Technical Implementation

#### Energy Sampling
- Energy data is sampled every 10 frames (approximately 100ms at 60fps)
- Data is stored per object with a maximum of 1000 data points to prevent memory issues
- Energy values are scaled by a factor of 1e-6 for reasonable display values

#### Physics Integration
- Energy calculations are integrated into the main physics update loop
- Energy data is automatically cleared when objects are absorbed by black holes
- All physics objects (planets, stars, black holes, etc.) are tracked

#### UI Components
- Tab-based interface with "Details" and "Energy" tabs
- Canvas-based chart rendering with grid lines and legend
- Responsive design that works on desktop and mobile devices

## Usage

1. **Select an Object**: Click on any celestial object in the simulation
2. **Open Inspector**: The object inspector will appear with the Details tab active
3. **Switch to Energy Tab**: Click the "Energy" tab to view energy data
4. **View Chart**: The energy chart will display if data is available
5. **Export Chart**: Click the "Export Chart" button to save the chart as PNG

## Energy Conservation

The total energy (kinetic + potential) should remain relatively constant in a closed system, though small variations may occur due to:
- Numerical precision in calculations
- Gravitational interactions with multiple objects
- Tidal effects and mass loss
- Collisions and mergers

## Performance Considerations

- Energy calculations are performed every 10 frames to balance accuracy and performance
- Data is limited to 1000 points per object to prevent memory issues
- Chart rendering is optimized for smooth updates
- Energy data is automatically cleaned up when objects are destroyed

## Future Enhancements

Potential improvements for the Energy tab feature:
- Energy conservation analysis and warnings
- Energy transfer visualization during collisions
- Comparative energy analysis between multiple objects
- Energy efficiency metrics for orbital systems
- Export of energy data in CSV format for external analysis 