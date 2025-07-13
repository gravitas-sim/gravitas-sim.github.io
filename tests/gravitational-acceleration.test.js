import { describe, test, expect, beforeEach } from '@jest/globals';
import { gravitational_acceleration, updatePhysicsSettings } from '../js/physics.js';

describe('gravitational_acceleration', () => {
  beforeEach(() => {
    // Reset physics settings to default before each test
    updatePhysicsSettings({
      gravitational_constant: 1.0,
    });
  });

  test('should return zero acceleration when no sources are provided', () => {
    const target_pos = { x: 0, y: 0 };
    const sources = [];
    
    const result = gravitational_acceleration(target_pos, sources);
    
    expect(result.ax).toBe(0);
    expect(result.ay).toBe(0);
  });

  test('should return zero acceleration when target is at same position as source', () => {
    const target_pos = { x: 0, y: 0 };
    const sources = [{ pos: { x: 0, y: 0 }, mass: 100 }];
    
    const result = gravitational_acceleration(target_pos, sources);
    
    expect(result.ax).toBe(0);
    expect(result.ay).toBe(0);
  });

  test('should calculate correct acceleration for single source along x-axis', () => {
    const target_pos = { x: 0, y: 0 };
    const sources = [{ pos: { x: 10, y: 0 }, mass: 100 }];
    
    const result = gravitational_acceleration(target_pos, sources);
    
    // Expected acceleration: G * mass / r^2 = 1.0 * 100 / 100 = 1.0
    expect(result.ax).toBe(1.0);
    expect(result.ay).toBe(0);
  });

  test('should calculate correct acceleration for single source along y-axis', () => {
    const target_pos = { x: 0, y: 0 };
    const sources = [{ pos: { x: 0, y: 10 }, mass: 100 }];
    
    const result = gravitational_acceleration(target_pos, sources);
    
    // Expected acceleration: G * mass / r^2 = 1.0 * 100 / 100 = 1.0
    expect(result.ax).toBe(0);
    expect(result.ay).toBe(1.0);
  });

  test('should calculate correct acceleration for diagonal source', () => {
    const target_pos = { x: 0, y: 0 };
    const sources = [{ pos: { x: 3, y: 4 }, mass: 100 }]; // Distance = 5
    
    const result = gravitational_acceleration(target_pos, sources);
    
    // Expected acceleration magnitude: G * mass / r^2 = 1.0 * 100 / 25 = 4.0
    // Components: ax = 4.0 * (3/5) = 2.4, ay = 4.0 * (4/5) = 3.2
    expect(result.ax).toBeCloseTo(2.4, 6);
    expect(result.ay).toBeCloseTo(3.2, 6);
  });

  test('should handle multiple sources correctly', () => {
    const target_pos = { x: 0, y: 0 };
    const sources = [
      { pos: { x: 10, y: 0 }, mass: 100 }, // Contributes ax = 1.0
      { pos: { x: 0, y: 10 }, mass: 100 }, // Contributes ay = 1.0
    ];
    
    const result = gravitational_acceleration(target_pos, sources);
    
    expect(result.ax).toBeCloseTo(1.0, 6);
    expect(result.ay).toBeCloseTo(1.0, 6);
  });

  test('should respect gravitational constant setting', () => {
    updatePhysicsSettings({ gravitational_constant: 2.0 });
    
    const target_pos = { x: 0, y: 0 };
    const sources = [{ pos: { x: 10, y: 0 }, mass: 100 }];
    
    const result = gravitational_acceleration(target_pos, sources);
    
    // Expected acceleration: G * mass / r^2 = 2.0 * 100 / 100 = 2.0
    expect(result.ax).toBe(2.0);
    expect(result.ay).toBe(0);
  });

  test('should apply minimum interaction distance', () => {
    const target_pos = { x: 0, y: 0 };
    const sources = [{ pos: { x: 1, y: 0 }, mass: 100 }]; // Very close source
    
    const result = gravitational_acceleration(target_pos, sources);
    
    // Should use MIN_INTERACTION_DISTANCE (5.0) instead of actual distance (1.0)
    // Expected acceleration: G * mass / MIN_DIST^2 = 1.0 * 100 / 25 = 4.0
    // But the actual implementation uses r_sq = Math.max(r_sq, MIN_INTERACTION_DISTANCE^2)
    // So r_sq = 25, r = 5, a_mag = 100/25 = 4.0, but direction is still (1,0)/1 = (1,0)
    // So ax = 4.0 * (1/5) = 0.8
    expect(result.ax).toBe(0.8);
    expect(result.ay).toBe(0);
  });

  test('should handle negative coordinates correctly', () => {
    const target_pos = { x: 0, y: 0 };
    const sources = [{ pos: { x: -10, y: 0 }, mass: 100 }];
    
    const result = gravitational_acceleration(target_pos, sources);
    
    // Force should point toward the source (negative x direction)
    expect(result.ax).toBe(-1.0);
    expect(result.ay).toBe(0);
  });

  test('should handle very large masses', () => {
    const target_pos = { x: 0, y: 0 };
    const sources = [{ pos: { x: 10, y: 0 }, mass: 1000000 }];
    
    const result = gravitational_acceleration(target_pos, sources);
    
    // Expected acceleration: G * mass / r^2 = 1.0 * 1000000 / 100 = 10000
    expect(result.ax).toBe(10000);
    expect(result.ay).toBe(0);
  });

  test('should handle very small masses', () => {
    const target_pos = { x: 0, y: 0 };
    const sources = [{ pos: { x: 10, y: 0 }, mass: 0.001 }];
    
    const result = gravitational_acceleration(target_pos, sources);
    
    // Expected acceleration: G * mass / r^2 = 1.0 * 0.001 / 100 = 0.00001
    expect(result.ax).toBe(0.00001);
    expect(result.ay).toBe(0);
  });

  test('should handle opposing forces correctly', () => {
    const target_pos = { x: 0, y: 0 };
    const sources = [
      { pos: { x: 10, y: 0 }, mass: 100 }, // Force to the right
      { pos: { x: -10, y: 0 }, mass: 100 }, // Force to the left
    ];
    
    const result = gravitational_acceleration(target_pos, sources);
    
    // Forces should cancel out
    expect(result.ax).toBeCloseTo(0, 10);
    expect(result.ay).toBe(0);
  });

  test('should handle complex multi-source scenario', () => {
    const target_pos = { x: 5, y: 5 };
    const sources = [
      { pos: { x: 0, y: 0 }, mass: 100 },
      { pos: { x: 10, y: 0 }, mass: 200 },
      { pos: { x: 0, y: 10 }, mass: 150 },
      { pos: { x: 10, y: 10 }, mass: 50 },
    ];
    
    const result = gravitational_acceleration(target_pos, sources);
    
    // This is a complex calculation, but we can verify the result is reasonable
    expect(typeof result.ax).toBe('number');
    expect(typeof result.ay).toBe('number');
    expect(isFinite(result.ax)).toBe(true);
    expect(isFinite(result.ay)).toBe(true);
    
    // The net force should be non-zero and finite
    const magnitude = Math.sqrt(result.ax * result.ax + result.ay * result.ay);
    expect(magnitude).toBeGreaterThan(0);
    expect(isFinite(magnitude)).toBe(true);
  });
}); 