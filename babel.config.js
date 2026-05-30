// Babel config for Jest — separate from webpack's inline config.
// Uses node:current target so Jest gets CommonJS output without bundling.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
};
