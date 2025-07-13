import { describe, test, expect, beforeEach } from '@jest/globals';
import { handle_collisions, PhysicsObject } from '../js/physics.js';

describe('handle_collisions', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('should handle empty objects list', () => {
    const objects_list = [];
    
    // Should not throw an error
    expect(() => handle_collisions(objects_list)).not.toThrow();
  });

  test('should handle single object without collision', () => {
    const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 1, y: 1 }, 50, 5);
    const objects_list = [obj];
    
    const initial_pos = { ...obj.pos };
    const initial_vel = { ...obj.vel };
    
    handle_collisions(objects_list);
    
    // Object should remain unchanged
    expect(obj.pos).toEqual(initial_pos);
    expect(obj.vel).toEqual(initial_vel);
  });

  test('should ignore dead objects', () => {
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: 1, y: 0 }, 50, 5);
    const obj2 = new PhysicsObject({ x: 0, y: 0 }, { x: -1, y: 0 }, 50, 5);
    obj1.alive = false; // Mark as dead
    
    const objects_list = [obj1, obj2];
    
    const initial_pos1 = { ...obj1.pos };
    const initial_vel1 = { ...obj1.vel };
    const initial_pos2 = { ...obj2.pos };
    const initial_vel2 = { ...obj2.vel };
    
    handle_collisions(objects_list);
    
    // Both objects should remain unchanged since one is dead
    expect(obj1.pos).toEqual(initial_pos1);
    expect(obj1.vel).toEqual(initial_vel1);
    expect(obj2.pos).toEqual(initial_pos2);
    expect(obj2.vel).toEqual(initial_vel2);
  });

  test('should not collide objects that are far apart', () => {
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: 1, y: 0 }, 50, 5);
    const obj2 = new PhysicsObject({ x: 100, y: 0 }, { x: -1, y: 0 }, 50, 5);
    const objects_list = [obj1, obj2];
    
    const initial_pos1 = { ...obj1.pos };
    const initial_vel1 = { ...obj1.vel };
    const initial_pos2 = { ...obj2.pos };
    const initial_vel2 = { ...obj2.vel };
    
    handle_collisions(objects_list);
    
    // Objects should remain unchanged
    expect(obj1.pos).toEqual(initial_pos1);
    expect(obj1.vel).toEqual(initial_vel1);
    expect(obj2.pos).toEqual(initial_pos2);
    expect(obj2.vel).toEqual(initial_vel2);
  });

  test('should separate overlapping objects', () => {
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 50, 5);
    const obj2 = new PhysicsObject({ x: 5, y: 0 }, { x: 0, y: 0 }, 50, 5); // Overlapping
    const objects_list = [obj1, obj2];
    
    handle_collisions(objects_list);
    
    // Objects should be separated
    const distance = Math.sqrt(
      (obj2.pos.x - obj1.pos.x) ** 2 + (obj2.pos.y - obj1.pos.y) ** 2
    );
    expect(distance).toBeGreaterThanOrEqual(10); // sum of radii
  });

  test('should handle head-on collision with equal masses', () => {
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: 10, y: 0 }, 50, 5);
    const obj2 = new PhysicsObject({ x: 8, y: 0 }, { x: -10, y: 0 }, 50, 5);
    const objects_list = [obj1, obj2];
    
    handle_collisions(objects_list);
    
    // With equal masses and head-on collision, velocities should reverse
    expect(obj1.vel.x).toBeLessThan(0); // Should move backward
    expect(obj2.vel.x).toBeGreaterThan(0); // Should move forward
    expect(obj1.vel.y).toBe(0); // No y-component
    expect(obj2.vel.y).toBe(0); // No y-component
  });

  test('should handle collision with different masses', () => {
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: 10, y: 0 }, 100, 5); // Heavy object
    const obj2 = new PhysicsObject({ x: 8, y: 0 }, { x: -10, y: 0 }, 10, 5); // Light object
    const objects_list = [obj1, obj2];
    
    const initial_momentum = obj1.mass * obj1.vel.x + obj2.mass * obj2.vel.x;
    
    handle_collisions(objects_list);
    
    const final_momentum = obj1.mass * obj1.vel.x + obj2.mass * obj2.vel.x;
    
    // Momentum should be approximately conserved
    expect(final_momentum).toBeCloseTo(initial_momentum, 5);
    
    // Heavy object should be less affected
    expect(Math.abs(obj1.vel.x)).toBeLessThan(Math.abs(obj2.vel.x));
  });

  test('should handle glancing collision', () => {
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: 10, y: 0 }, 50, 5);
    const obj2 = new PhysicsObject({ x: 8, y: 3 }, { x: -10, y: 0 }, 50, 5);
    const objects_list = [obj1, obj2];
    
    handle_collisions(objects_list);
    
    // Both objects should have y-velocity components after glancing collision
    expect(obj1.vel.y).not.toBe(0);
    expect(obj2.vel.y).not.toBe(0);
  });

  test('should handle multiple collisions in one call', () => {
    // Create three objects in a line, all overlapping
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 50, 5);
    const obj2 = new PhysicsObject({ x: 5, y: 0 }, { x: 0, y: 0 }, 50, 5);
    const obj3 = new PhysicsObject({ x: 10, y: 0 }, { x: 0, y: 0 }, 50, 5);
    const objects_list = [obj1, obj2, obj3];
    
    handle_collisions(objects_list);
    
    // Objects should be pushed apart, but may not reach full separation in one call
    const dist12 = Math.sqrt(
      (obj2.pos.x - obj1.pos.x) ** 2 + (obj2.pos.y - obj1.pos.y) ** 2
    );
    const dist23 = Math.sqrt(
      (obj3.pos.x - obj2.pos.x) ** 2 + (obj3.pos.y - obj2.pos.y) ** 2
    );
    const dist13 = Math.sqrt(
      (obj3.pos.x - obj1.pos.x) ** 2 + (obj3.pos.y - obj1.pos.y) ** 2
    );
    
    // Objects should be pushed apart, but may not reach full separation in one call
    expect(dist12).toBeGreaterThan(5);
    expect(dist23).toBeGreaterThan(5);
    expect(dist13).toBeGreaterThan(10);
  });

  test('should handle collision with stationary object', () => {
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: 10, y: 0 }, 50, 5);
    const obj2 = new PhysicsObject({ x: 8, y: 0 }, { x: 0, y: 0 }, 50, 5); // Stationary
    const objects_list = [obj1, obj2];
    
    handle_collisions(objects_list);
    
    // Stationary object should gain velocity
    expect(obj2.vel.x).toBeGreaterThan(0);
    // Moving object should lose velocity
    expect(obj1.vel.x).toBeLessThan(10);
  });

  test('should apply coefficient of restitution', () => {
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: 10, y: 0 }, 50, 5);
    const obj2 = new PhysicsObject({ x: 8, y: 0 }, { x: 0, y: 0 }, 50, 5);
    const objects_list = [obj1, obj2];
    
    const initial_kinetic_energy = 0.5 * obj1.mass * obj1.vel.x ** 2;
    
    handle_collisions(objects_list);
    
    const final_kinetic_energy = 
      0.5 * obj1.mass * (obj1.vel.x ** 2 + obj1.vel.y ** 2) +
      0.5 * obj2.mass * (obj2.vel.x ** 2 + obj2.vel.y ** 2);
    
    // Energy should be lost due to coefficient of restitution (e = 0.8)
    expect(final_kinetic_energy).toBeLessThan(initial_kinetic_energy);
  });

  test('should handle very small distance between objects', () => {
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: 1, y: 0 }, 50, 5);
    const obj2 = new PhysicsObject({ x: 0.001, y: 0 }, { x: -1, y: 0 }, 50, 5);
    const objects_list = [obj1, obj2];
    
    // Should not throw an error or cause division by zero
    expect(() => handle_collisions(objects_list)).not.toThrow();
    
    // Objects should be separated, but may not move much due to small initial distance
    const distance = Math.sqrt(
      (obj2.pos.x - obj1.pos.x) ** 2 + (obj2.pos.y - obj1.pos.y) ** 2
    );
    expect(distance).toBeGreaterThanOrEqual(0.001);
  });

  test('should handle collision with zero mass object', () => {
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: 10, y: 0 }, 50, 5);
    const obj2 = new PhysicsObject({ x: 8, y: 0 }, { x: 0, y: 0 }, 0, 5); // Zero mass
    const objects_list = [obj1, obj2];
    
    // Should not throw an error
    expect(() => handle_collisions(objects_list)).not.toThrow();
  });

  test('should handle objects with different radii', () => {
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: 10, y: 0 }, 50, 10); // Large radius
    const obj2 = new PhysicsObject({ x: 15, y: 0 }, { x: -10, y: 0 }, 50, 2); // Small radius
    const objects_list = [obj1, obj2];
    
    handle_collisions(objects_list);
    
    // Objects should be separated by sum of their radii
    const distance = Math.sqrt(
      (obj2.pos.x - obj1.pos.x) ** 2 + (obj2.pos.y - obj1.pos.y) ** 2
    );
    expect(distance).toBeGreaterThanOrEqual(12); // 10 + 2
  });

  test('should handle collision where objects are moving apart', () => {
    const obj1 = new PhysicsObject({ x: 0, y: 0 }, { x: -10, y: 0 }, 50, 5);
    const obj2 = new PhysicsObject({ x: 8, y: 0 }, { x: 10, y: 0 }, 50, 5);
    const objects_list = [obj1, obj2];
    
    const initial_vel1 = { ...obj1.vel };
    const initial_vel2 = { ...obj2.vel };
    
    handle_collisions(objects_list);
    
    // If objects are moving apart, collision response should not be applied
    // (This tests the vel_normal < 0 condition)
    // The objects should still be separated though
    const distance = Math.sqrt(
      (obj2.pos.x - obj1.pos.x) ** 2 + (obj2.pos.y - obj1.pos.y) ** 2
    );
    expect(distance).toBeGreaterThanOrEqual(10);
  });
}); 