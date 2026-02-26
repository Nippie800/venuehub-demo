export default ({ config }) => ({
  ...config,
  extra: {
    VENUE_PIN: process.env.VENUE_PIN ?? "2468",
    KITCHEN_PIN: process.env.KITCHEN_PIN ?? "1357",
  },
});