import { describe, expect, it } from 'vitest';
import { SKIN_SIZE } from '../src/core/constants';
import { createDefaultBase } from '../src/core/defaultSkin';
import { PIXEL_COUNT, getPixel, setPixel } from '../src/core/layers';
import { getFaceRect } from '../src/core/uvMap';
import { detectModel, upgradeLegacySkin } from '../src/io/importer';

describe('importer', () => {
  it('upgrades a 64×32 skin by mirroring the right limbs', () => {
    const legacy = new Uint8ClampedArray(SKIN_SIZE * (SKIN_SIZE / 2) * 4);
    const rightArmFront = getFaceRect('classic', 'rightArm', 'front', 'base');
    setPixel(legacy, rightArmFront.x, rightArmFront.y, [200, 10, 10, 255]);

    const upgraded = upgradeLegacySkin(legacy);
    expect(upgraded.length).toBe(PIXEL_COUNT * 4);

    const leftArmFront = getFaceRect('classic', 'leftArm', 'front', 'base');
    expect(getPixel(upgraded, leftArmFront.x + leftArmFront.w - 1, leftArmFront.y)).toEqual([200, 10, 10, 255]);
  });

  it('detects slim and classic models', () => {
    expect(detectModel(createDefaultBase('classic'))).toBe('classic');
    expect(detectModel(createDefaultBase('slim'))).toBe('slim');
  });
});
