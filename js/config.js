// config.js — runtime configuration
// API keys stored in localStorage only, never committed

const CONFIG = {
  github: {
    owner: 'elmalehanthony',
    repo: 'medusa-capital-dashboard',
    branch: 'main',
    dataPath: 'data/portfolio.json'
  },
  claude: {
    model: 'claude-sonnet-4-6',
    maxTokens: 4000
  },
  account: {
    number: '230-32415',
    name: 'Medusa Capital',
    inception: '2020-03-17'
  }
};

const Keys = {
  getAnthropic: () => localStorage.getItem('mc_anthropic_key') || '',
  setAnthropic: (k) => localStorage.setItem('mc_anthropic_key', k),
  getGithub: () => localStorage.getItem('mc_github_token') || '',
  setGithub: (k) => localStorage.setItem('mc_github_token', k),
  clear: () => {
    localStorage.removeItem('mc_anthropic_key');
    localStorage.removeItem('mc_github_token');
  }
};
