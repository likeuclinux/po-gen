module.exports = {
  test: {
    globals: true,        // <-- makes describe/test/expect available
    environment: 'node',  // you manually create JSDOM in tests; node is fine
    root: '.',            // ensure test/ is picked up from project root
    include: ['test/**/*.test.js'],
  },
};
