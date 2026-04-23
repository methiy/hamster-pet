// src/sprites/image-frames.ts
// Image-based animation frame definitions.
// Each animation maps to a set of pre-sliced PNG files.

/** Animation definition using image paths */
export interface ImageAnimationDef {
  /** Frame image URLs (resolved by Vite at build time) */
  frames: string[]
  /** Playback speed in frames per second */
  fps: number
  /** Whether the animation loops or stops on last frame */
  loop: boolean
}

// --- Import all sprite PNGs ---
// Idle (4 frames)
import idle0 from '../assets/sprites/idle-0.png'
import idle1 from '../assets/sprites/idle-1.png'
import idle2 from '../assets/sprites/idle-2.png'
import idle3 from '../assets/sprites/idle-3.png'

// Eating (6 frames)
import eating0 from '../assets/sprites/eating-0.png'
import eating1 from '../assets/sprites/eating-1.png'
import eating2 from '../assets/sprites/eating-2.png'
import eating3 from '../assets/sprites/eating-3.png'
import eating4 from '../assets/sprites/eating-4.png'
import eating5 from '../assets/sprites/eating-5.png'

// Sleeping (4 frames)
import sleeping0 from '../assets/sprites/sleeping-0.png'
import sleeping1 from '../assets/sprites/sleeping-1.png'
import sleeping2 from '../assets/sprites/sleeping-2.png'
import sleeping3 from '../assets/sprites/sleeping-3.png'

// Running (4 frames)
import running0 from '../assets/sprites/running-0.png'
import running1 from '../assets/sprites/running-1.png'
import running2 from '../assets/sprites/running-2.png'
import running3 from '../assets/sprites/running-3.png'

// Happy (6 frames)
import happy0 from '../assets/sprites/happy-0.png'
import happy1 from '../assets/sprites/happy-1.png'
import happy2 from '../assets/sprites/happy-2.png'
import happy3 from '../assets/sprites/happy-3.png'
import happy4 from '../assets/sprites/happy-4.png'
import happy5 from '../assets/sprites/happy-5.png'

// Hiding (4 frames)
import hiding0 from '../assets/sprites/hiding-0.png'
import hiding1 from '../assets/sprites/hiding-1.png'
import hiding2 from '../assets/sprites/hiding-2.png'
import hiding3 from '../assets/sprites/hiding-3.png'

// Adventure Out (6 frames)
import advOut0 from '../assets/sprites/adventure-out-0.png'
import advOut1 from '../assets/sprites/adventure-out-1.png'
import advOut2 from '../assets/sprites/adventure-out-2.png'
import advOut3 from '../assets/sprites/adventure-out-3.png'
import advOut4 from '../assets/sprites/adventure-out-4.png'
import advOut5 from '../assets/sprites/adventure-out-5.png'

// Adventure Back (6 frames)
import advBack0 from '../assets/sprites/adventure-back-0.png'
import advBack1 from '../assets/sprites/adventure-back-1.png'
import advBack2 from '../assets/sprites/adventure-back-2.png'
import advBack3 from '../assets/sprites/adventure-back-3.png'
import advBack4 from '../assets/sprites/adventure-back-4.png'
import advBack5 from '../assets/sprites/adventure-back-5.png'

// New animations (each 4 frames) -----------------------------------
import shy0 from '../assets/sprites/shy-0.png'
import shy1 from '../assets/sprites/shy-1.png'
import shy2 from '../assets/sprites/shy-2.png'
import shy3 from '../assets/sprites/shy-3.png'

import chase0 from '../assets/sprites/chase-0.png'
import chase1 from '../assets/sprites/chase-1.png'
import chase2 from '../assets/sprites/chase-2.png'
import chase3 from '../assets/sprites/chase-3.png'

import grabbed0 from '../assets/sprites/grabbed-0.png'
import grabbed1 from '../assets/sprites/grabbed-1.png'
import grabbed2 from '../assets/sprites/grabbed-2.png'
import grabbed3 from '../assets/sprites/grabbed-3.png'

import landed0 from '../assets/sprites/landed-0.png'
import landed1 from '../assets/sprites/landed-1.png'
import landed2 from '../assets/sprites/landed-2.png'
import landed3 from '../assets/sprites/landed-3.png'

import pushH0 from '../assets/sprites/push-horizontal-0.png'
import pushH1 from '../assets/sprites/push-horizontal-1.png'
import pushH2 from '../assets/sprites/push-horizontal-2.png'
import pushH3 from '../assets/sprites/push-horizontal-3.png'

import pushV0 from '../assets/sprites/push-vertical-0.png'
import pushV1 from '../assets/sprites/push-vertical-1.png'
import pushV2 from '../assets/sprites/push-vertical-2.png'
import pushV3 from '../assets/sprites/push-vertical-3.png'

import angry0 from '../assets/sprites/angry-0.png'
import angry1 from '../assets/sprites/angry-1.png'
import angry2 from '../assets/sprites/angry-2.png'
import angry3 from '../assets/sprites/angry-3.png'

import yawn0 from '../assets/sprites/yawn-0.png'
import yawn1 from '../assets/sprites/yawn-1.png'
import yawn2 from '../assets/sprites/yawn-2.png'
import yawn3 from '../assets/sprites/yawn-3.png'

import scratch0 from '../assets/sprites/scratch-0.png'
import scratch1 from '../assets/sprites/scratch-1.png'
import scratch2 from '../assets/sprites/scratch-2.png'
import scratch3 from '../assets/sprites/scratch-3.png'

import bark0 from '../assets/sprites/bark-0.png'
import bark1 from '../assets/sprites/bark-1.png'
import bark2 from '../assets/sprites/bark-2.png'
import bark3 from '../assets/sprites/bark-3.png'

// --- Animation Definitions ---
export const idleAnimation: ImageAnimationDef = {
  frames: [idle0, idle1, idle2, idle3],
  fps: 4,
  loop: true,
}

export const eatingAnimation: ImageAnimationDef = {
  frames: [eating0, eating1, eating2, eating3, eating4, eating5],
  fps: 8,
  loop: true,
}

export const sleepingAnimation: ImageAnimationDef = {
  frames: [sleeping0, sleeping1, sleeping2, sleeping3],
  fps: 3,
  loop: true,
}

export const runningAnimation: ImageAnimationDef = {
  frames: [running0, running1, running2, running3],
  fps: 6,
  loop: true,
}

export const happyAnimation: ImageAnimationDef = {
  frames: [happy0, happy1, happy2, happy3, happy4, happy5],
  fps: 8,
  loop: true,
}

export const hidingAnimation: ImageAnimationDef = {
  frames: [hiding0, hiding1, hiding2, hiding3],
  fps: 6,
  loop: false,
}

export const adventureOutAnimation: ImageAnimationDef = {
  frames: [advOut0, advOut1, advOut2, advOut3, advOut4, advOut5],
  fps: 8,
  loop: false,
}

export const adventureBackAnimation: ImageAnimationDef = {
  frames: [advBack0, advBack1, advBack2, advBack3, advBack4, advBack5],
  fps: 8,
  loop: false,
}

// --- New animations ---
export const shyAnimation: ImageAnimationDef = {
  frames: [shy0, shy1, shy2, shy3],
  fps: 5,
  loop: true,
}

export const chaseAnimation: ImageAnimationDef = {
  frames: [chase0, chase1, chase2, chase3],
  fps: 8,
  loop: true,
}

export const grabbedAnimation: ImageAnimationDef = {
  frames: [grabbed0, grabbed1, grabbed2, grabbed3],
  fps: 5,
  loop: true,
}

export const landedAnimation: ImageAnimationDef = {
  frames: [landed0, landed1, landed2, landed3],
  fps: 8,
  loop: false,
}

export const pushHorizontalAnimation: ImageAnimationDef = {
  frames: [pushH0, pushH1, pushH2, pushH3],
  fps: 6,
  loop: true,
}

export const pushVerticalAnimation: ImageAnimationDef = {
  frames: [pushV0, pushV1, pushV2, pushV3],
  fps: 6,
  loop: true,
}

export const angryAnimation: ImageAnimationDef = {
  frames: [angry0, angry1, angry2, angry3],
  fps: 6,
  loop: true,
}

export const yawnAnimation: ImageAnimationDef = {
  frames: [yawn0, yawn1, yawn2, yawn3],
  fps: 5,
  loop: false,
}

export const scratchAnimation: ImageAnimationDef = {
  frames: [scratch0, scratch1, scratch2, scratch3],
  fps: 6,
  loop: true,
}

export const barkAnimation: ImageAnimationDef = {
  frames: [bark0, bark1, bark2, bark3],
  fps: 8,
  loop: true,
}

