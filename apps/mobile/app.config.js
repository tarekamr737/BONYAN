const { requireReleaseApiUrl } = require("./release-env.cjs");

module.exports = ({ config }) => {
  const releaseProfile = ["staging", "production"].includes(process.env.EAS_BUILD_PROFILE);
  if (process.env.BONYAN_RELEASE_BUILD === "1" || releaseProfile) {
    requireReleaseApiUrl();
  }
  return config;
};
