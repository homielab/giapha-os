# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Unit tests (`bun run test`) for GEDCOM and CSV import/export, kinship terms and tree helpers.

### Fixed

- CSV import keeps text columns as text: phone numbers keep their leading zero, ids and dates are no longer turned into numbers or dates. Only the number and yes/no columns of `persons.csv` are converted.
- Kinship terms through marriage: no more double spaces ("Em vợ (họ)"), and a younger sibling's husband or wife is "Em rể" / "Em dâu" instead of "Em rể (họ)" / "Em dâu (họ)".

### Known issues

- GEDCOM export/import loses or changes some relationships:
  - a child of a man's second wife is also linked to his first wife;
  - a child linked only to the father becomes a child of his wife (e.g. a stepmother) after re-import;
  - a parent with gender "other" and no spouse loses the link to the children;
  - adopted children come back as biological children.
- GEDCOM export drops the day of a birth or death date that has a day and a year but no month.
- GEDCOM export marks the last word of a Vietnamese name as the surname (`Nguyễn Văn /An/`).

## [2.4.0] - 2026-10-18

Last release before this changelog was started.
