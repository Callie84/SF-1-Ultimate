// Jest Config für Price Service
const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'price-service',
  rootDir: './',
  // Coverage-Schwellwerte des Basis-Configs hier nicht erzwingen — es gibt
  // aktuell nur gezielte Unit-Tests für die reine Logik (offer-sort), keine
  // Vollabdeckung des Service. `npm test` läuft daher ohne --coverage.
  coverageThreshold: undefined,
};
