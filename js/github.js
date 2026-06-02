// github.js — commit portfolio.json back to the repo via GitHub API

const Github = {
  baseUrl: 'https://api.github.com',

  headers(token) {
    return {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    };
  },

  async getFileSha(token) {
    const { owner, repo, branch, dataPath } = CONFIG.github;
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${dataPath}?ref=${branch}`;
    const res = await fetch(url, { headers: this.headers(token) });
    if (!res.ok) return null;
    const json = await res.json();
    return json.sha;
  },

  async savePortfolio(portfolioData) {
    const token = Keys.getGithub();
    if (!token) throw new Error('No GitHub token set. Add it on the Upload page.');

    const { owner, repo, branch, dataPath } = CONFIG.github;
    const sha = await this.getFileSha(token);

    const content = btoa(unescape(encodeURIComponent(
      JSON.stringify(portfolioData, null, 2)
    )));

    const date = new Date().toISOString().split('T')[0];
    const body = {
      message: `data: update portfolio.json — ${date}`,
      content,
      branch,
      ...(sha && { sha })
    };

    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${dataPath}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.headers(token),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`GitHub API error: ${err.message}`);
    }

    return await res.json();
  }
};
