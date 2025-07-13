import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { PhysicsObject, updatePhysicsSettings } from '../js/physics.js';

describe('PhysicsObject', () => {
  beforeEach(() => {
    // Reset physics settings to default before each test
    updatePhysicsSettings({
      gravitational_constant: 1.0,
      trail_length: 100,
    });
  });

  describe('constructor', () => {
    test('should create a physics object with correct initial properties', () => {
      const pos = { x: 10, y: 20 };
      const vel = { x: 1, y: 2 };
      const mass = 50;
      const radius = 5;
      const obj_type = 'TestObject';

      const obj = new PhysicsObject(pos, vel, mass, radius, obj_type);

      expect(obj.pos).toEqual(pos);
      expect(obj.vel).toEqual(vel);
      expect(obj.mass).toBe(mass);
      expect(obj.radius).toBe(radius);
      expect(obj.obj_type).toBe(obj_type);
      expect(obj.trail).toEqual([]);
      expect(obj.alive).toBe(true);
      expect(typeof obj.id).toBe('number');
    });

    test('should create separate position and velocity objects (not references)', () => {
      const pos = { x: 10, y: 20 };
      const vel = { x: 1, y: 2 };

      const obj = new PhysicsObject(pos, vel, 50, 5);

      // Modify original objects
      pos.x = 999;
      vel.x = 999;

      // Object should maintain original values
      expect(obj.pos.x).toBe(10);
      expect(obj.vel.x).toBe(1);
    });

    test('should handle string mass and radius by converting to numbers', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, '50.5', '5.5');

      expect(obj.mass).toBe(50.5);
      expect(obj.radius).toBe(5.5);
    });

    test('should use default obj_type when not provided', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 50, 5);

      expect(obj.obj_type).toBe('object');
    });
  });

  describe('update_physics', () => {
    test('should not update physics when object is not alive', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 1, y: 1 }, 50, 5);
      obj.alive = false;

      const initial_pos = { ...obj.pos };
      const initial_vel = { ...obj.vel };

      obj.update_physics(0.1, []);

      expect(obj.pos).toEqual(initial_pos);
      expect(obj.vel).toEqual(initial_vel);
    });

    test('should update position based on velocity', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 10, y: 20 }, 50, 5);
      const dt = 0.1;

      obj.update_physics(dt, []);

      expect(obj.pos.x).toBe(1.0); // 0 + 10 * 0.1
      expect(obj.pos.y).toBe(2.0); // 0 + 20 * 0.1
    });

    test('should update velocity based on gravitational acceleration', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 50, 5);
      const gravity_sources = [{ pos: { x: 10, y: 0 }, mass: 100 }];
      const dt = 0.1;

      obj.update_physics(dt, gravity_sources);

      // Expected acceleration: G * mass / r^2 = 1.0 * 100 / 100 = 1.0
      // Expected velocity change: 1.0 * 0.1 = 0.1
      expect(obj.vel.x).toBe(0.1);
      expect(obj.vel.y).toBe(0);
    });

    test('should update both velocity and position correctly', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 5, y: 0 }, 50, 5);
      const gravity_sources = [{ pos: { x: 10, y: 0 }, mass: 100 }];
      const dt = 0.1;

      obj.update_physics(dt, gravity_sources);

      // Expected acceleration: 1.0 (from gravity calculation)
      // Expected velocity: 5 + 1.0 * 0.1 = 5.1
      // Expected position: 0 + 5.1 * 0.1 = 0.51
      expect(obj.vel.x).toBe(5.1);
      expect(obj.pos.x).toBe(0.51);
    });

    test('should handle multiple gravity sources', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 50, 5);
      const gravity_sources = [
        { pos: { x: 10, y: 0 }, mass: 100 }, // ax = 1.0
        { pos: { x: 0, y: 10 }, mass: 100 }, // ay = 1.0
      ];
      const dt = 0.1;

      obj.update_physics(dt, gravity_sources);

      expect(obj.vel.x).toBeCloseTo(0.1, 6);
      expect(obj.vel.y).toBeCloseTo(0.1, 6);
    });

    test('should handle zero time step', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 5, y: 5 }, 50, 5);
      const gravity_sources = [{ pos: { x: 10, y: 0 }, mass: 100 }];
      const initial_pos = { ...obj.pos };
      const initial_vel = { ...obj.vel };

      obj.update_physics(0, gravity_sources);

      expect(obj.pos).toEqual(initial_pos);
      expect(obj.vel).toEqual(initial_vel);
    });

    test('should handle empty gravity sources', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 5, y: 5 }, 50, 5);
      const dt = 0.1;

      obj.update_physics(dt, []);

      // Should only update position based on velocity (no acceleration)
      expect(obj.pos.x).toBe(0.5);
      expect(obj.pos.y).toBe(0.5);
      expect(obj.vel.x).toBe(5);
      expect(obj.vel.y).toBe(5);
    });
  });

  describe('update_trail', () => {
    test('should add trail point when object is alive', () => {
      const obj = new PhysicsObject({ x: 10, y: 20 }, { x: 1, y: 2 }, 50, 5);

      obj.update_trail();

      expect(obj.trail.length).toBe(1);
      expect(obj.trail[0].x).toBe(10);
      expect(obj.trail[0].y).toBe(20);
      expect(obj.trail[0].timestamp).toBe(1234567890); // Mocked Date.now()
      expect(obj.trail[0].velocity).toBeCloseTo(Math.sqrt(5), 6); // sqrt(1^2 + 2^2)
      expect(obj.trail[0].age).toBe(1); // Age starts at 1 due to increment in update_trail
    });

    test('should not add trail point when object is not alive', () => {
      const obj = new PhysicsObject({ x: 10, y: 20 }, { x: 1, y: 2 }, 50, 5);
      obj.alive = false;

      obj.update_trail();

      expect(obj.trail.length).toBe(0);
    });

    test('should limit trail length based on settings', () => {
      updatePhysicsSettings({ trail_length: 3 });
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 50, 5);

      // Add 5 trail points
      for (let i = 0; i < 5; i++) {
        obj.pos.x = i;
        obj.update_trail();
      }

      expect(obj.trail.length).toBe(3);
      expect(obj.trail[0].x).toBe(2); // First point should be removed
      expect(obj.trail[2].x).toBe(4); // Last point should be kept
    });

    test('should increment age of existing trail points', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 50, 5);

      obj.update_trail();
      obj.update_trail();

      expect(obj.trail[0].age).toBe(2); // First point gets incremented twice
      expect(obj.trail[1].age).toBe(1); // Second point gets incremented once
    });
  });

  describe('check_absorption', () => {
    test('should return false when object is not alive', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 50, 5);
      obj.alive = false;
      const bh_list = [{ pos: { x: 0, y: 0 }, radius: 10, mass: 100 }];

      const result = obj.check_absorption(bh_list);

      expect(result).toBe(false);
    });

    test('should return false when no black holes are present', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 50, 5);
      const bh_list = [];

      const result = obj.check_absorption(bh_list);

      expect(result).toBe(false);
    });

    test('should return false when object is outside absorption range', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 50, 5);
      const bh_list = [{ pos: { x: 100, y: 0 }, radius: 10, mass: 100, updateRadius: jest.fn() }];

      const result = obj.check_absorption(bh_list);

      expect(result).toBe(false);
      expect(obj.alive).toBe(true);
    });

    test('should return true and mark object as not alive when absorbed', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 50, 5);
      const mockBH = { 
        pos: { x: 0, y: 0 }, 
        radius: 10, 
        mass: 100, 
        updateRadius: jest.fn() 
      };
      const bh_list = [mockBH];

      const result = obj.check_absorption(bh_list);

      expect(result).toBe(true);
      expect(obj.alive).toBe(false);
      expect(mockBH.mass).toBe(150); // 100 + 50
      expect(mockBH.updateRadius).toHaveBeenCalled();
    });

    test('should handle multiple black holes and absorb to closest one', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 50, 5);
      const mockBH1 = { 
        pos: { x: 5, y: 0 }, 
        radius: 10, 
        mass: 100, 
        updateRadius: jest.fn() 
      };
      const mockBH2 = { 
        pos: { x: 20, y: 0 }, 
        radius: 10, 
        mass: 200, 
        updateRadius: jest.fn() 
      };
      const bh_list = [mockBH1, mockBH2];

      const result = obj.check_absorption(bh_list);

      expect(result).toBe(true);
      expect(obj.alive).toBe(false);
      expect(mockBH1.mass).toBe(150); // Closer BH gets the mass
      expect(mockBH2.mass).toBe(200); // Farther BH unchanged
      expect(mockBH1.updateRadius).toHaveBeenCalled();
      expect(mockBH2.updateRadius).not.toHaveBeenCalled();
    });
  });

  describe('get_state and set_state', () => {
    test('should return correct state object', () => {
      const obj = new PhysicsObject({ x: 10, y: 20 }, { x: 1, y: 2 }, 50, 5, 'TestObject');

      const state = obj.get_state();

      expect(state.id).toBe(obj.id);
      expect(state.type).toBe('TestObject');
      expect(state.pos).toEqual({ x: 10, y: 20 });
      expect(state.vel).toEqual({ x: 1, y: 2 });
      expect(state.mass).toBe(50);
      expect(state.radius).toBe(5);
      expect(state.alive).toBe(true);
    });

    test('should restore state correctly', () => {
      const obj = new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1, 1, 'Original');
      obj.trail = [{ x: 1, y: 1 }]; // Add some trail data

      const new_state = {
        id: 999,
        obj_type: 'NewType', // Use obj_type instead of type
        pos: { x: 100, y: 200 },
        vel: { x: 10, y: 20 },
        mass: 500,
        radius: 50,
        alive: false,
      };

      obj.set_state(new_state);

      expect(obj.id).toBe(999);
      expect(obj.obj_type).toBe('NewType');
      expect(obj.pos).toEqual({ x: 100, y: 200 });
      expect(obj.vel).toEqual({ x: 10, y: 20 });
      expect(obj.mass).toBe(500);
      expect(obj.radius).toBe(50);
      expect(obj.alive).toBe(false);
      expect(obj.trail).toEqual([]); // Trail should be reset
    });
  });
}); 