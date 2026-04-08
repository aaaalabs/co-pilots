import { describe, it, expect } from "vitest";
import { circlesOverlap, pointInCircle } from "../src/game/Collision";

describe("Collision", () => {
  describe("circlesOverlap", () => {
    it("returns true for overlapping circles", () => {
      expect(circlesOverlap(0, 0, 10, 5, 0, 10)).toBe(true);
    });

    it("returns false for non-overlapping circles", () => {
      expect(circlesOverlap(0, 0, 5, 100, 100, 5)).toBe(false);
    });

    it("returns true for touching circles (edge case)", () => {
      // distance = 10, sum of radii = 10
      expect(circlesOverlap(0, 0, 5, 10, 0, 5)).toBe(true);
    });

    it("returns true for one circle fully inside another", () => {
      expect(circlesOverlap(0, 0, 20, 1, 1, 2)).toBe(true);
    });

    it("returns false for circles just barely apart", () => {
      // distance = 10.01, sum of radii = 10
      expect(circlesOverlap(0, 0, 5, 10.01, 0, 5)).toBe(false);
    });
  });

  describe("pointInCircle", () => {
    it("returns true for a point inside the circle", () => {
      expect(pointInCircle(1, 1, 0, 0, 5)).toBe(true);
    });

    it("returns false for a point outside the circle", () => {
      expect(pointInCircle(10, 10, 0, 0, 5)).toBe(false);
    });

    it("returns true for a point exactly on the circle edge", () => {
      expect(pointInCircle(5, 0, 0, 0, 5)).toBe(true);
    });
  });
});
