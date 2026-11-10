import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ORB_FRAGMENT_SHADER,
  ORB_VERTEX_SHADER,
  clampOrbIntensity,
  initOrbWebgl,
  normalizeOrbHue,
} from '../app/utils/aiOrbShader';

test('normalizeOrbHue wraps angles into [0, 360) and handles non-finite input', () => {
  assert.equal(normalizeOrbHue(0), 0);
  assert.equal(normalizeOrbHue(360), 0);
  assert.equal(normalizeOrbHue(450), 90);
  assert.equal(normalizeOrbHue(-30), 330);
  assert.equal(normalizeOrbHue(Number.NaN), 0);
  assert.equal(normalizeOrbHue(Number.POSITIVE_INFINITY), 0);
});

test('clampOrbIntensity bounds hover intensity within [0, 2] with default on NaN', () => {
  assert.equal(clampOrbIntensity(-1), 0);
  assert.equal(clampOrbIntensity(0.45), 0.45);
  assert.equal(clampOrbIntensity(5), 2);
  assert.equal(clampOrbIntensity(Number.NaN), 0.35);
});

test('ORB shaders declare required GLSL uniforms and varyings for interactive light-bg compositing', () => {
  for (const attr of ['attribute vec2 position;', 'attribute vec2 uv;', 'varying vec2 vUv;']) {
    assert.ok(ORB_VERTEX_SHADER.includes(attr), `missing vertex declaration: ${attr}`);
  }

  for (const uniform of [
    'uniform float iTime;',
    'uniform vec3 iResolution;',
    'uniform float hue;',
    'uniform float hover;',
    'uniform float rot;',
    'uniform float hoverIntensity;',
    'uniform vec2 uMouse;',
    'varying vec2 vUv;',
  ]) {
    assert.ok(ORB_FRAGMENT_SHADER.includes(uniform), `missing fragment uniform: ${uniform}`);
  }

  assert.ok(ORB_FRAGMENT_SHADER.includes('snoise3'));
  assert.ok(ORB_FRAGMENT_SHADER.includes('adjustHue'));
});

test('initOrbWebgl returns null gracefully when WebGL context is unavailable or throws', () => {
  const nullCanvas = {
    getContext: () => null,
  } as unknown as HTMLCanvasElement;
  assert.equal(initOrbWebgl(nullCanvas), null);

  const throwingCanvas = {
    getContext() {
      throw new Error('WebGL disabled');
    },
  } as unknown as HTMLCanvasElement;
  assert.equal(initOrbWebgl(throwingCanvas), null);
});
