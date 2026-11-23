import { Container, Graphics } from "pixi.js";
import type { Proportions } from "./CharacterGrowthController";
import type { Pose } from "./CharacterAnimator";

const SILHOUETTE_COLOR = 0x000000;

interface LimbChain {
  /** Positioned at the shoulder/hip; rotation = upper-bone swing angle. */
  origin: Container;
  /** Child of origin, positioned at the end of the upper bone; rotation = lower-bone bend, relative to origin. */
  joint: Container;
  upperBone: Graphics;
  lowerBone: Graphics;
  tip: Graphics;
  foot: boolean;
}

export interface CharacterRig {
  root: Container;
  torso: Graphics;
  head: Graphics;
  satchel: Graphics;
  leftLeg: LimbChain;
  rightLeg: LimbChain;
  leftArm: LimbChain;
  rightArm: LimbChain;
}

function createLimbChain(parent: Container, foot = false): LimbChain {
  const origin = new Container();
  const upperBone = new Graphics();
  const joint = new Container();
  const lowerBone = new Graphics();
  const tip = new Graphics();

  origin.addChild(upperBone);
  origin.addChild(joint);
  joint.addChild(lowerBone);
  joint.addChild(tip);
  parent.addChild(origin);

  return { origin, joint, upperBone, lowerBone, tip, foot };
}

function drawBone(g: Graphics, length: number, width: number) {
  g.clear();
  if (length <= 0 || width <= 0) return;
  const half = width / 2;
  g.moveTo(-half * 0.8, 0)
    .quadraticCurveTo(0, -half * 0.72, half * 0.8, 0)
    .quadraticCurveTo(half * 1.22, length * 0.34, half * 0.69, length * 0.76)
    .lineTo(half * 0.6, length)
    .quadraticCurveTo(0, length + half * 0.52, -half * 0.58, length)
    .quadraticCurveTo(-half * 0.55, length * 0.73, -half * 0.94, length * 0.48)
    .quadraticCurveTo(-half * 1.16, length * 0.22, -half * 0.8, 0)
    .fill(SILHOUETTE_COLOR);
}

function updateLimbChain(
  chain: LimbChain,
  originX: number,
  originY: number,
  upperAngle: number,
  lowerAngle: number,
  upperLength: number,
  lowerLength: number,
  width: number,
  tipRadius: number,
  footPitch = 0,
) {
  chain.origin.position.set(originX, originY);
  chain.origin.rotation = upperAngle;
  drawBone(chain.upperBone, upperLength, width);

  chain.joint.position.set(0, upperLength);
  chain.joint.rotation = lowerAngle;
  drawBone(chain.lowerBone, lowerLength, width * 0.85);

  chain.tip.clear();
  chain.tip.position.y = lowerLength;
  if (chain.foot) {
    chain.tip.rotation = footPitch - upperAngle - lowerAngle;
    chain.tip.scale.set(tipRadius);
    chain.tip.moveTo(-0.7, -0.9)
      .quadraticCurveTo(0, -1.05, 0.75, -0.4)
      .quadraticCurveTo(1.65, -0.1, 2.05, 0.02)
      .quadraticCurveTo(2.27, 0.39, 1.33, 0.4)
      .lineTo(-0.77, 0.4).quadraticCurveTo(-1, -0.08, -0.7, -0.9)
      .fill(SILHOUETTE_COLOR);
  } else {
    chain.tip.ellipse(0, 0, tipRadius * 0.83, tipRadius * 1.15).fill(SILHOUETTE_COLOR);
  }
}

export function createCharacterRig(): CharacterRig {
  const root = new Container();
  const torso = new Graphics();
  const head = new Graphics();
  const satchel = new Graphics()
    .moveTo(-0.34, 0.04).quadraticCurveTo(-0.52, 0.05, -0.53, 0.41)
    .lineTo(-0.71, 0.46).quadraticCurveTo(-0.87, 0.51, -0.83, 0.69)
    .lineTo(-0.77, 0.89).quadraticCurveTo(-0.57, 0.96, -0.19, 0.87)
    .lineTo(-0.21, 0.43).lineTo(-0.44, 0.41)
    .quadraticCurveTo(-0.44, 0.17, -0.23, 0.06).closePath().fill(SILHOUETTE_COLOR);

  const leftLeg = createLimbChain(root, true);
  const leftArm = createLimbChain(root);
  const rightLeg = createLimbChain(root, true);
  root.addChild(satchel, torso, head);
  const rightArm = createLimbChain(root);

  return { root, torso, head, satchel, leftLeg, rightLeg, leftArm, rightArm };
}

/**
 * Sets every bone's length/width/angle from continuous proportions + pose.
 * Nothing here scales a sprite — the skeleton is redrawn from scratch each
 * frame from the current numbers, which is what makes the child-to-adult
 * growth a smooth function rather than a step change.
 */
export function updateCharacterRig(rig: CharacterRig, proportions: Proportions, pose: Pose, groundScreenY: number, baseAdultHeight: number, slope: number, studyBag: number) {
  const totalHeight = baseAdultHeight * proportions.heightScale;
  const legLength = totalHeight * proportions.legRatio;
  const headHeight = baseAdultHeight * proportions.headHeightScale;
  const torsoLength = Math.max(10, totalHeight - legLength - headHeight);
  const shoulderWidth = totalHeight * proportions.shoulderWidthRatio * 0.68;
  const hipWidth = shoulderWidth * 0.76;
  const armLength = totalHeight * proportions.armRatio;

  const upperLegLen = legLength * 0.52;
  const lowerLegLen = legLength * 0.48;
  const upperArmLen = armLength * 0.55;
  const lowerArmLen = armLength * 0.45;
  const limbWidth = Math.max(4, totalHeight * 0.071);
  const footRadius = limbWidth * 0.61;
  const handRadius = limbWidth * 0.39;
  const localSlope = pose.facing * slope;
  const slopeAngle = Math.atan(localSlope);
  const lean = pose.leanX - localSlope * totalHeight * 0.18 * pose.walkBlend;

  rig.root.scale.x = pose.facing;
  // Set the weight-bearing heel or toe onto the local tangent of the path.
  // Each ankle has its own horizontal position when the legs are apart.
  const footDepth = (offset: number, hip: number, knee: number, pitch: number) => {
    const ankleX = offset - upperLegLen * Math.sin(hip) - lowerLegLen * Math.sin(hip + knee);
    const reach = upperLegLen * Math.cos(hip) + lowerLegLen * Math.cos(hip + knee);
    const soleDepth = footRadius * (0.4 * Math.cos(pitch) + Math.max(-0.77 * Math.sin(pitch), 2.05 * Math.sin(pitch)));
    return reach - localSlope * ankleX + soleDepth / Math.cos(slopeAngle);
  };
  const hipOffset = hipWidth * 0.21;
  const leftDepth = footDepth(-hipOffset, pose.leftHip, pose.leftKnee, pose.leftFootPitch);
  const rightDepth = footDepth(hipOffset, pose.rightHip, pose.rightKnee, pose.rightFootPitch);
  rig.root.position.y = groundScreenY + legLength - Math.max(leftDepth, rightDepth);

  const hipY = -legLength;
  const shoulderY = hipY - torsoLength - totalHeight * 0.0025 * pose.breath;

  // A curved jacket hem, projecting chin and boot toes give the black
  // silhouette a readable profile in either direction.
  const w = shoulderWidth;
  rig.torso.position.set(lean, shoulderY);
  rig.torso.scale.set(w, torsoLength);
  rig.torso.clear()
    .moveTo(-0.17, -0.06)
    .quadraticCurveTo(-0.48, -0.015, -0.51, 0.22)
    .quadraticCurveTo(-0.55, 0.40, -0.43, 0.62)
    .quadraticCurveTo(-0.44, 0.81, -0.51, 0.99)
    .quadraticCurveTo(-0.17, 1.09, 0.39, 1.035)
    .lineTo(0.34, 0.8).quadraticCurveTo(0.45, 0.62, 0.39, 0.47)
    .quadraticCurveTo(0.49, 0.29, 0.34, 0.13)
    .lineTo(0.14, -0.04).closePath().fill(SILHOUETTE_COLOR);

  rig.satchel.visible = studyBag > 0;
  rig.satchel.position.set(lean, shoulderY);
  rig.satchel.scale.set(w * studyBag, torsoLength);
  rig.satchel.rotation = 0.035 * pose.walkBlend * Math.sin(pose.phase * Math.PI * 2);
  rig.head.position.set(lean + pose.headSwayX + headHeight * 0.06, shoulderY);
  rig.head.rotation = -slopeAngle * 0.18 * pose.walkBlend;
  rig.head.scale.set(headHeight);
  rig.head.clear()
    .moveTo(-0.19, 0.05).lineTo(-0.19, -0.18)
    .quadraticCurveTo(-0.5, -0.27, -0.42, -0.73)
    .quadraticCurveTo(-0.39, -1.03, -0.11, -1.01)
    .lineTo(-0.17, -1.08).quadraticCurveTo(0.25, -1.06, 0.4, -0.83)
    .lineTo(0.45, -0.76).lineTo(0.35, -0.72).lineTo(0.37, -0.57)
    .lineTo(0.47, -0.44).lineTo(0.37, -0.41)
    .quadraticCurveTo(0.38, -0.19, 0.22, -0.19)
    .lineTo(0.15, -0.19).lineTo(0.17, 0.05).closePath().fill(SILHOUETTE_COLOR);

  updateLimbChain(rig.leftLeg, -hipOffset, hipY, pose.leftHip, pose.leftKnee, upperLegLen, lowerLegLen, limbWidth * 1.22, footRadius, slopeAngle + pose.leftFootPitch);
  updateLimbChain(rig.rightLeg, hipOffset, hipY, pose.rightHip, pose.rightKnee, upperLegLen, lowerLegLen, limbWidth * 1.22, footRadius, slopeAngle + pose.rightFootPitch);
  updateLimbChain(rig.leftArm, -shoulderWidth * 0.14 + lean, shoulderY + limbWidth * 0.35, pose.leftShoulder, -pose.leftElbow - 0.20, upperArmLen, lowerArmLen, limbWidth * 0.76, handRadius);
  updateLimbChain(rig.rightArm, shoulderWidth * 0.13 + lean, shoulderY + limbWidth * 0.35, pose.rightShoulder, -pose.rightElbow - 0.20, upperArmLen, lowerArmLen, limbWidth * 0.76, handRadius);
}
