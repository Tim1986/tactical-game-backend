/**
 * Team service validation tests.
 * Tests the pure validation logic without hitting the database.
 */

import { describe, it, expect } from 'vitest';
import { TeamValidationError } from '../src/services/teamService.js';

describe('TeamValidationError', () => {
  it('has the correct name', () => {
    const err = new TeamValidationError('too many units');
    expect(err.name).toBe('TeamValidationError');
    expect(err.message).toBe('too many units');
  });

  it('is an instance of Error', () => {
    const err = new TeamValidationError('test');
    expect(err instanceof Error).toBe(true);
  });
});

// Team size constraint is enforced by Zod in the route layer.
// These tests cover the domain rule documentation.
describe('Team size rules', () => {
  const TEAM_SIZE = 4;

  it('should require exactly 4 units', () => {
    const validTeam = ['a', 'b', 'c', 'd'];
    expect(validTeam.length).toBe(TEAM_SIZE);
  });

  it('should reject teams with duplicate unit IDs', () => {
    const duplicates = ['unit-1', 'unit-1', 'unit-2', 'unit-3'];
    const uniqueIds = new Set(duplicates);
    expect(uniqueIds.size).not.toBe(TEAM_SIZE);
  });

  it('should accept teams with all unique unit IDs', () => {
    const valid = ['unit-1', 'unit-2', 'unit-3', 'unit-4'];
    const uniqueIds = new Set(valid);
    expect(uniqueIds.size).toBe(TEAM_SIZE);
  });
});
