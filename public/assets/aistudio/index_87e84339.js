// ponytail: keyword-density duel; upgrade to LLM evaluation when API key provided.
const score = (p) => new Set((p || '').toLowerCase().match(/\b\w+\b/g) || []).size;

function battle(p1, p2) {
  const s1 = score(p1);
  const s2 = score(p2);
  return { p1: s1, p2: s2, winner: s1 > s2 ? 1 : s2 > s1 ? 2 : 0 };
}

if (process.argv.includes('--test')) {
  const assert = require('node:assert');
  assert.strictEqual(battle('hello world', 'hello').winner, 1);
  assert.strictEqual(battle('tie', 'tie').winner, 0);
  console.log('Self-check passed.');
  process.exit(0);
}

if (require.main === module) {
  const readline = require('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Player 1 prompt: ', (p1) => {
    rl.question('Player 2 prompt: ', (p2) => {
      const res = battle(p1, p2);
      console.log(`Scores -> P1: ${res.p1} | P2: ${res.p2}`);
      console.log(res.winner ? `Winner: Player ${res.winner}` : 'Draw');
      rl.close();
    });
  });
}

module.exports = { battle, score };
