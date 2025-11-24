# Version Synchronization Process

This document outlines the process for maintaining version synchronization across all platforms for the Blog Link Analyzer extension.

## Automated Semantic Release Implementation

As of v1.2.4, the project now implements fully automated semantic releases with end-to-end deployment pipeline.

### How It Works

1. **Commit Analysis**: Semantic Release analyzes commit messages to determine version bump
2. **Automatic Release**: Creates GitHub release with changelog and assets
3. **Store Deployment**: Automatically deploys to Chrome Web Store and Firefox Add-ons
4. **Version Synchronization**: All platforms maintain consistent versioning

### Commit Message Format

Use conventional commits to trigger releases:

- `feat:` for new features (minor version)
- `fix:` for bug fixes (patch version)
- `BREAKING CHANGE:` for breaking changes (major version)

### Current Status

✅ **Automated Versioning**: Semantic Release manages version numbers
✅ **GitHub Releases**: Automatic creation with changelog
✅ **Asset Generation**: Extension packages built and attached
✅ **Store Deployment**: Automated submission to browser stores
✅ **Version Sync**: All platforms synchronized automatically
✅ **Permissions Fixed**: GitHub Actions write access enabled
✅ **Pipeline Tested**: Full automated semantic release working

## Current Platform Status

As of v1.1.1, all platforms are synchronized:

- **Chrome Web Store**: v1.1.1 (ready for submission)
- **Firefox Add-ons**: v1.1.1 (already deployed)
- **GitHub Releases**: v1.1.1 (published)
- **Source Code**: package.json v1.1.1

## Version Synchronization Workflow

### 1. Pre-Release Checklist

Before creating a new release:

- [ ] Update `package.json` version
- [ ] Update README.md version references
- [ ] Update CHANGELOG.md with release notes
- [ ] Run full test suite: `npm run validate`
- [ ] Build all packages: `npm run package:all-formats`

### 2. Release Process

1. **Commit Changes**

   ```bash
   git add .
   git commit -m "Release v{VERSION}"
   ```

2. **Create Git Tag**

   ```bash
   git tag v{VERSION}
   ```

3. **Push to Remote**

   ```bash
   git push origin main --tags
   ```

4. **Create GitHub Release**
   ```bash
   gh release create v{VERSION} \
     --title "Version {VERSION}" \
     --notes "Release notes..." \
     *.zip *.crx *.xpi
   ```

### 3. Platform Deployment

#### Chrome Web Store

1. Download `blog-link-analyzer-{VERSION}.zip` from GitHub release
2. Upload to Chrome Developer Dashboard
3. Submit for review

#### Firefox Add-ons

1. Download `blog-link-analyzer-firefox-v{VERSION}.xpi` from GitHub release
2. Upload to Firefox Developer Hub
3. Submit for review

### 4. Post-Release Validation

- [ ] Verify Chrome Web Store shows new version
- [ ] Verify Firefox Add-ons shows new version
- [ ] Verify GitHub release is published
- [ ] Update any external documentation

## Automated CI/CD Process

The `.github/workflows/ci-cd.yml` workflow handles:

1. **Testing**: Runs on all PRs and pushes
2. **Building**: Creates all package formats
3. **Security Scanning**: Audits dependencies
4. **Release Deployment**: Automatically deploys on GitHub releases

### Release Triggers

The workflow deploys to stores when:

- A GitHub release is published (`github.event_name == 'release'`)
- All tests and security scans pass

### Required Secrets

For automated deployment, configure these repository secrets:

- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`
- `CHROME_EXTENSION_ID`
- `FIREFOX_JWT_ISSUER`
- `FIREFOX_JWT_SECRET`

## Version Validation Commands

Use these commands to verify version synchronization:

```bash
# Check package.json version
node -p "require('./package.json').version"

# Check Chrome package version
unzip -p blog-link-analyzer-*.zip manifest.json | grep '"version"'

# Check Firefox package version
unzip -p blog-link-analyzer-firefox-*.zip manifest.json | grep '"version"'

# List all generated packages
ls -la *.zip *.crx *.xpi
```

## Troubleshooting

### Version Mismatch Issues

If platforms show different versions:

1. **Identify the source of truth** (usually package.json)
2. **Update lagging platforms** to match
3. **Rebuild packages** with correct version
4. **Create new release** if necessary

### Build Failures

If package creation fails:

1. **Clean build artifacts**: `npm run clean`
2. **Reinstall dependencies**: `rm -rf node_modules && npm install`
3. **Check Node.js version**: `node --version` (should be >=20.0.0)
4. **Verify build scripts**: Check `scripts/` directory

### Store Submission Issues

If store submissions fail:

1. **Check manifest validation** using store tools
2. **Verify package contents** match store requirements
3. **Review store policies** for any violations
4. **Check file sizes** within store limits

## Best Practices

1. **Semantic Versioning**: Follow MAJOR.MINOR.PATCH format
2. **Changelog Maintenance**: Update CHANGELOG.md for every release
3. **Testing**: Always run full test suite before releases
4. **Backup**: Keep previous versions for rollback capability
5. **Documentation**: Update README and other docs with new features

## Rollback Process

If a release needs to be rolled back:

1. **Identify the last stable version**
2. **Use rollback script**: `./scripts/rollback.sh latest chrome,firefox`
3. **Create hotfix release** if necessary
4. **Update documentation** with rollback information

---

This process ensures all platforms remain synchronized and releases are consistent across the ecosystem.
