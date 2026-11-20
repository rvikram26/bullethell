import type { DialogueDef } from './types';

/**
 * Story scenes shown before and after boss fights. Speakers other than Wren appear on the right.
 * Keep lines short (about 90 characters) so they fit the dialogue box.
 */
export const DIALOGUES: Record<string, DialogueDef> = {
  // --- Stage 1 -----------------------------------------------------------------------------
  's1-mid': {
    lines: [
      { who: 'tamsin', text: 'A lantern! Moving, glowing, and so very warm. I will just borrow it.' },
      { who: 'wren', text: 'It is the only light I have, and I am taking it to the Beacon.' },
      { who: 'tamsin', text: 'The Beacon? There is nothing up there but dark. Hold still, I will be quick!' },
    ],
  },
  's1-boss': {
    lines: [
      { who: 'odalys', text: 'Lamplighter. The marsh has been quiet since the Beacon went out. Quiet is kind.' },
      { who: 'wren', text: 'The Tide is climbing every lamp in Halcyra. The quiet will not last.' },
      { who: 'odalys', text: 'Then show me your light, and I will decide whether it is worth keeping.' },
    ],
  },
  's1-after': {
    lines: [
      { who: 'odalys', text: 'Warm. It burns softer than I remembered. Go on, then.' },
      { who: 'odalys', text: 'The Cloudway is cold, and the stargazer there counts every flame that passes.' },
      { who: 'wren', text: 'Thank you. I will bring the light back.' },
    ],
  },

  // --- Stage 2 -----------------------------------------------------------------------------
  's2-mid': {
    lines: [
      { who: 'brindle', text: 'Parcel for the Beacon! Parcel for the Beacon! Wait. Are you the Beacon?' },
      { who: 'wren', text: 'I am a lamplighter. I am going there.' },
      { who: 'brindle', text: 'Then you can sign for it! But deliveries are timed, so catch me first!' },
    ],
  },
  's2-boss': {
    lines: [
      { who: 'vesper', text: 'Two hundred years the Beacon blotted out the stars. Tonight they came back.' },
      { who: 'wren', text: 'The Tide will drown the whole city if the Beacon stays dark.' },
      { who: 'vesper', text: 'Perhaps. But I will not trade my sky for a lamp without a fight. Show me.' },
    ],
  },
  's2-after': {
    lines: [
      { who: 'vesper', text: 'Hm. Your flame does not erase the sky. It only sits beside it.' },
      { who: 'wren', text: 'The Beacon could be like that.' },
      { who: 'vesper', text: 'Then let it. Climb. The Keeper at the top has been dimming it for a reason.' },
    ],
  },

  // --- Stage 3 -----------------------------------------------------------------------------
  's3-mid': {
    lines: [
      { who: 'kessra', text: 'Halt! The Spire is closed for the night, by order of the Keeper!' },
      { who: 'wren', text: 'Then the Keeper can tell me so herself.' },
      { who: 'kessra', text: 'She will tell you in lightning. Ready?' },
    ],
  },
  's3-boss': {
    lines: [
      { who: 'auriel', text: 'You climbed all this way for a lamp. How tiresome.' },
      { who: 'wren', text: 'The Beacon kept the Tide back for two hundred years.' },
      { who: 'auriel', text: 'And it was burning me out. I am the wick, little lighter. I dimmed it so I could rest.' },
      { who: 'wren', text: 'Then let me light it so that it does not have to burn you.' },
      { who: 'auriel', text: 'Show me a light that does not consume, and I will gladly be done.' },
    ],
  },
  's3-after': {
    lines: [
      { who: 'auriel', text: '...It is quiet. No pain at all. How strange.' },
      { who: 'wren', text: 'The Beacon does not need a wick. It needs a keeper who is allowed to rest.' },
      { who: 'auriel', text: 'Then keep it with me, for a while. Come. Let us light it together.' },
    ],
  },
};
