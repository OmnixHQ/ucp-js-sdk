# Changelog

## [2.0.0](https://github.com/OmnixHQ/ucp-js-sdk/compare/v1.1.0...v2.0.0) (2026-04-10)


### ⚠ BREAKING CHANGES

* UCP spec v2026-04-08 changes runtime validation behavior of existing schemas:
    - TotalSchema now uses signed amounts (negative values allowed for discounts)
    - OrderSchema requires currency field
    - Order adjustment `amount` field renamed to `totals`
    - risk_signals deprecated in favor of signals on CheckoutSchema
    - Embedded Protocol error responses use standard error_response envelope

### Features

* add daily UCP spec release detection workflow ([#23](https://github.com/OmnixHQ/ucp-js-sdk/issues/23)) ([8f7ac58](https://github.com/OmnixHQ/ucp-js-sdk/commit/8f7ac582c5b39ccf64ea15931fe29ecd7247a110))
* upgrade to UCP spec v2026-04-08 ([#31](https://github.com/OmnixHQ/ucp-js-sdk/issues/31)) ([264c2d9](https://github.com/OmnixHQ/ucp-js-sdk/commit/264c2d9ad7c82bba29edde6917f0d8467d5e2e13))
* upgrade to UCP spec v2026-04-08 (major version bump) ([#32](https://github.com/OmnixHQ/ucp-js-sdk/issues/32)) ([5e247aa](https://github.com/OmnixHQ/ucp-js-sdk/commit/5e247aad49dcbc8ef6d59c05f77b32bcaf94e295))


### Bug Fixes

* pass --branch main to verify:schemas in draft-regenerate workflow ([#28](https://github.com/OmnixHQ/ucp-js-sdk/issues/28)) ([4f2172d](https://github.com/OmnixHQ/ucp-js-sdk/commit/4f2172dc44db3309d7d487693c47c76e915bc4f8))
* remove unenrolled GitHub Sponsors from FUNDING.yml ([#26](https://github.com/OmnixHQ/ucp-js-sdk/issues/26)) ([304c2bc](https://github.com/OmnixHQ/ucp-js-sdk/commit/304c2bc02fa234275a4fda2f97b5014822031553))
* trigger draft-publish after draft-regenerate pushes ([#29](https://github.com/OmnixHQ/ucp-js-sdk/issues/29)) ([ce2800b](https://github.com/OmnixHQ/ucp-js-sdk/commit/ce2800bab5f5a187b480345255beeef94fe879d0))


### Maintenance

* add community standards (CoC, security policy, issue/PR templates) ([#27](https://github.com/OmnixHQ/ucp-js-sdk/issues/27)) ([4965398](https://github.com/OmnixHQ/ucp-js-sdk/commit/496539899dc153dd340ce8718d041a9eb279ac1e))
* add FUNDING.yml with GitHub Sponsors and Omnix link ([#25](https://github.com/OmnixHQ/ucp-js-sdk/issues/25)) ([8c13d16](https://github.com/OmnixHQ/ucp-js-sdk/commit/8c13d1661846d54b451f9ad03c9c8844c4184466))

## [1.1.0](https://github.com/OmnixHQ/ucp-js-sdk/compare/v1.0.2...v1.1.0) (2026-03-31)


### Features

* draft spec support with npm next tag publishing ([#21](https://github.com/OmnixHQ/ucp-js-sdk/issues/21)) ([6cf8a27](https://github.com/OmnixHQ/ucp-js-sdk/commit/6cf8a274141b37f41667294719ac52ec818dcfb1))


### Documentation

* update README, fix draft CI verify:schemas ([#22](https://github.com/OmnixHQ/ucp-js-sdk/issues/22)) ([d436f98](https://github.com/OmnixHQ/ucp-js-sdk/commit/d436f982c2d57433100cd5e61302e8c7a54dc884))


### Maintenance

* add Google site verification file ([#17](https://github.com/OmnixHQ/ucp-js-sdk/issues/17)) ([ce30977](https://github.com/OmnixHQ/ucp-js-sdk/commit/ce3097759bc1b44d65fcbdacbe24cdedb30d0ff8))
* remove Google site verification file ([#19](https://github.com/OmnixHQ/ucp-js-sdk/issues/19)) ([db0af2f](https://github.com/OmnixHQ/ucp-js-sdk/commit/db0af2f03dcea0d2841b9c422161e522d169039f))

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
