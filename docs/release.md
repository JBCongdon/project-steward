# Release

Kairn releases are versioned with npm package versions and GitHub tags.

## Local Checks

Run the release gate before tagging:

```sh
npm run check
npm test
npm run build
npm run benchmark:packets
npm run eval
npm run study
npm pack --dry-run
```

## GitHub Releases

Create a `v*` tag or GitHub release after the release gate passes. The release workflow repeats the local gate on GitHub Actions.

## npm Publishing

The package name is `@jbcongdon/kairn`.

Publishing from GitHub Actions requires a repository secret named `NPM_TOKEN`. If the secret is absent, the release workflow still verifies the package and skips `npm publish`.

Manual publishing requires npm auth on the local machine:

```sh
npm login
npm publish --access public
```
