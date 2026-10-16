# Spec Delta

## Purpose

Runs the project's automated checks on every change pushed to GitHub, so a broken build, a failing test or an accessibility regression is caught before it reaches `main`.

## ADDED Requirements

### Requirement: Checks run on every push and pull request
The repository SHALL run its automated checks on every push to `main`, on every pull request targeting `main`, and on manual request. A newer push to the same branch or pull request MUST cancel checks still running for an older one.

#### Scenario: Pull request opened
- **WHEN** a pull request targeting `main` is opened or updated
- **THEN** the automated checks start for its latest commit without anyone triggering them

#### Scenario: Superseded run
- **WHEN** a second commit is pushed to a pull request while checks for the first are still running
- **THEN** the checks for the first commit are cancelled and checks for the second commit run

### Requirement: Frontend checks
The automated checks SHALL install the frontend's locked dependencies and fail if the unit tests fail, the production build fails, the demo build fails, or the contrast check reports a colour pair below WCAG AA.

#### Scenario: Failing unit test
- **WHEN** a commit makes one frontend unit test fail
- **THEN** the frontend check fails and names the failing test in its log

#### Scenario: Build budget exceeded
- **WHEN** a commit pushes a bundle or stylesheet over its error budget
- **THEN** the frontend check fails

### Requirement: Backend checks
The automated checks SHALL build the API and run its test suite against a database created for the run, and fail if the build or any test fails.

#### Scenario: Business rule regression
- **WHEN** a commit lets a payment larger than the balance due succeed
- **THEN** the backend check fails

### Requirement: End-to-end checks
The automated checks SHALL run the end-to-end tests against the demo build and fail if any test fails. On failure, the traces and screenshots MUST be kept as a downloadable artifact of the run.

#### Scenario: Broken flow
- **WHEN** a commit stops the payment confirmation dialog from opening
- **THEN** the end-to-end check fails and the run offers the failing test's trace for download

### Requirement: Separate, named results
Frontend, backend and end-to-end results SHALL be reported as separate named checks on the commit or pull request, so one failure does not hide the others.

#### Scenario: Only the backend fails
- **WHEN** a pull request breaks an API test but nothing in the frontend
- **THEN** the pull request shows the backend check as failed and the frontend and end-to-end checks as passed

### Requirement: Checks never publish
The automated checks MUST NOT deploy, publish or push anything. Publishing the demo stays a manual step.

#### Scenario: Merge to main
- **WHEN** a pull request is merged to `main` and its checks pass
- **THEN** the GitHub Pages demo is unchanged until someone deploys it by hand
