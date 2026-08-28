export type CliSpinnerVariant =
  | 'braille-spin'
  | 'aesthetic'
  | 'line-dash'
  | 'dots'
  | 'moon'
  | 'arc';

export type CliSpinnerDef = {
  interval: number;
  frames: string[];
};

export const CLI_SPINNERS: Record<CliSpinnerVariant, CliSpinnerDef> = {
  'braille-spin': {
    interval: 80,
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  },
  aesthetic: {
    interval: 80,
    frames: [
      '▰▱▱▱▱▱▱',
      '▰▰▱▱▱▱▱',
      '▰▰▰▱▱▱▱',
      '▰▰▰▰▱▱▱',
      '▰▰▰▰▰▱▱',
      '▰▰▰▰▰▰▱',
      '▰▰▰▰▰▰▰',
      '▱▰▰▰▰▰▰',
      '▱▱▰▰▰▰▰',
      '▱▱▱▰▰▰▰',
      '▱▱▱▱▰▰▰',
      '▱▱▱▱▱▰▰',
      '▱▱▱▱▱▱▰',
    ],
  },
  'line-dash': {
    interval: 130,
    frames: ['-', '\\', '|', '/'],
  },
  dots: {
    interval: 80,
    frames: ['.  ', '.. ', '...', '   '],
  },
  moon: {
    interval: 80,
    frames: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'],
  },
  arc: {
    interval: 100,
    frames: ['◜', '◠', '◝', '◞', '◡', '◟'],
  },
};
