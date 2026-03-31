# Changelog

## [1.0.2](https://github.com/OmnixHQ/ucp-js-sdk/compare/v1.0.1...v1.0.2) (2026-03-31)


### Bug Fixes

* generate discovery profile schemas instead of hand-authoring ([#15](https://github.com/OmnixHQ/ucp-js-sdk/issues/15)) ([b3dc3f6](https://github.com/OmnixHQ/ucp-js-sdk/commit/b3dc3f63282280d292febbc7c9e496ae85ee7a71))

## [1.0.1](https://github.com/OmnixHQ/ucp-js-sdk/compare/v1.0.0...v1.0.1) (2026-03-30)


### Documentation

* add badges, CONTRIBUTING.md, and fix contributing link ([#13](https://github.com/OmnixHQ/ucp-js-sdk/issues/13)) ([0971810](https://github.com/OmnixHQ/ucp-js-sdk/commit/0971810a8b6ca570be65c6558dc13c40cebfe7af))


### Maintenance

* exclude CHANGELOG.md from prettier (managed by release-please) ([b1f594d](https://github.com/OmnixHQ/ucp-js-sdk/commit/b1f594db5c9ab136f1db80581fb36e431005023b))
* format CHANGELOG.md for prettier check ([b09c9a5](https://github.com/OmnixHQ/ucp-js-sdk/commit/b09c9a5eeca2e80da8a05e27d439c0e4abfc555a))

## [1.0.0](https://github.com/OmnixHQ/ucp-js-sdk/compare/v0.1.0...v1.0.0) (2026-03-30)

### ⚠ BREAKING CHANGES

- removes schemas that were quicktype artefacts and did not match the spec (CheckoutWithFulfillmentResponseSchema etc.); all consumers should migrate to the new schema names listed in extensions.ts.

### Features

- eliminate z.any() — full typed coverage from UCP spec ([#8](https://github.com/OmnixHQ/ucp-js-sdk/issues/8)) ([84cad0a](https://github.com/OmnixHQ/ucp-js-sdk/commit/84cad0ae2beefac37cb2d558d58a0d4031b35977))
- full spec migration, CI/release setup, verify:schemas ([b2a4ae5](https://github.com/OmnixHQ/ucp-js-sdk/commit/b2a4ae50259bbec2e3a1e7257fd7677033acb4e9))

### Bug Fixes

- correct CheckoutResponseStatusSchema values and compatibility gaps ([a6dd23b](https://github.com/OmnixHQ/ucp-js-sdk/commit/a6dd23b395917856aa7957766419a45d1d57b16c))
- resolve devDependency vulnerabilities (brace-expansion, diff, yaml) ([#1](https://github.com/OmnixHQ/ucp-js-sdk/issues/1)) ([fee5bef](https://github.com/OmnixHQ/ucp-js-sdk/commit/fee5beff7977e45918964e84e984203112f51d92))

### Documentation

- update README and add developer guides ([#6](https://github.com/OmnixHQ/ucp-js-sdk/issues/6)) ([63d34df](https://github.com/OmnixHQ/ucp-js-sdk/commit/63d34df046c5c6e14d45f856ba56ebed5f2f4618))

### Maintenance

- add CLAUDE.md with project rules, architecture, and session context ([#7](https://github.com/OmnixHQ/ucp-js-sdk/issues/7)) ([e1f8dce](https://github.com/OmnixHQ/ucp-js-sdk/commit/e1f8dce304384d1fd13a794ce909607f94f3b0c0))
- ignore .env, .idea, and .claude in .gitignore ([#11](https://github.com/OmnixHQ/ucp-js-sdk/issues/11)) ([42305f4](https://github.com/OmnixHQ/ucp-js-sdk/commit/42305f4c16ef87c19c5ba0139ce904409f2bb8e4))
- initial import from Universal-Commerce-Protocol/js-sdk v0.1.0 (Apache-2.0) ([307d818](https://github.com/OmnixHQ/ucp-js-sdk/commit/307d818f82c721ba29524df861a49f75f6d356b0))
- remove upstream CI workflows, will add own ([5de0482](https://github.com/OmnixHQ/ucp-js-sdk/commit/5de048216830d2d75189fb62db28895043e818d8))
- rename package to @omnixhq/ucp-js-sdk, point repo to OmnixHQ/ucp-js-sdk ([7ff6fba](https://github.com/OmnixHQ/ucp-js-sdk/commit/7ff6fba75760bad1cc73bde39753efed7424b6a8))
