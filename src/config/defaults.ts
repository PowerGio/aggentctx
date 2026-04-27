import type { AgentctxConfig } from '../types/index.js';

export const DEFAULT_CONFIG: AgentctxConfig = {
  output: {
    agents: true,
    claude: true,
    design: true,
    directory: './',
  },
  update: {
    strategy: 'overwrite',
    backup: true,
  },
  detection: {
    excludeDirs: ['node_modules', '.git', 'dist', '.next', 'vendor', '__pycache__', '.venv'],
  },
};
