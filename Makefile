GO ?= go
GOLANGCI_LINT ?= $$($(GO) env GOPATH)/bin/golangci-lint
GOLANGCI_LINT_VERSION ?= v1.56.2

COMMIT ?= "$(shell git describe --long --dirty --always --match "" || true)"
VERSION ?= "$(shell git describe --tags --abbrev=0 || true)"
BUILD_TIMESTAMP ?= "$(shell date '+%B%d,%Y')"
LDFLAGS ?= -s -w -X main.commit="$(COMMIT)" -X main.version="$(VERSION)" -X main.buildTimestamp="$(BUILD_TIMESTAMP)"

.PHONY: lint
lint: linter
	$(GOLANGCI_LINT) run --skip-dirs frontend/dist --timeout 30m

.PHONY: linter
linter:
	test -f $(GOLANGCI_LINT) || curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $$($(GO) env GOPATH)/bin $(GOLANGCI_LINT_VERSION)

.PHONY: test
test:
	$(GO) test -v -timeout 20m ./pkg/fuse

.PHONY: test-race
test-race:
	$(GO) test -v -race -timeout 20m ./pkg/fuse

dist:
	mkdir $@

.PHONY: clean
clean:
	$(GO) clean
	rm -rf dist/

.PHONY: binary
binary: export CGO_ENABLED=1
binary: dist FORCE
	$(GO) version
	wails build -trimpath -ldflags "$(LDFLAGS)"

.PHONY: linux-binary
binary: export CGO_ENABLED=1
binary: dist FORCE
	$(GO) version
	wails build -trimpath -ldflags "$(LDFLAGS)" -tags webkit2_41

FORCE:
