const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Prevent Metro's FallbackWatcher from crashing on ephemeral pnpm temp dirs.
// pnpm creates and immediately deletes _tmp_NNNN directories during postinstall;
// if Metro tries to watch one after it's deleted it throws ENOENT.
const blockList = [
  // temp directories created by pnpm postinstall scripts
  /node_modules[/\\].*_tmp_\d+/,
  // native Android build artefacts that should never be bundled
  /android[/\\]build[/\\]/,
  /android[/\\].gradle[/\\]/,
];

config.resolver = {
  ...config.resolver,
  blockList: [
    ...(Array.isArray(config.resolver?.blockList)
      ? config.resolver.blockList
      : config.resolver?.blockList
        ? [config.resolver.blockList]
        : []),
    ...blockList,
  ],
};

// Include the monorepo root so cross-package imports resolve correctly.
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, "../.."),
];

module.exports = config;
