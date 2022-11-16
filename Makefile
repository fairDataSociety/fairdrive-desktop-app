GO ?= go
GOLANGCI_LINT ?= $$($(GO) env GOPATH)/bin/golangci-lint
GOLANGCI_LINT_VERSION ?= v1.50.1

COMMIT ?= "$(shell git describe --long --dirty --always --match "" || true)"
VERSION ?= "$(shell git describe --tags --abbrev=0 || true)"
LDFLAGS ?= -s -w -X github.com/datafund/fdfs.commit="$(COMMIT)" -X github.com/datafund/fdfs.version="$(VERSION)"

.PHONY: lint
lint: linter
	$(GOLANGCI_LINT) run

.PHONY: linter
linter:
	test -f $(GOLANGCI_LINT) || curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $$($(GO) env GOPATH)/bin $(GOLANGCI_LINT_VERSION)

.PHONY: test
test:
	$(GO) test -v ./... -timeout 5m

.PHONY: test-race
test-race:
	$(GO) test -v ./... -race -timeout 20m

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
	cd app && wails build -trimpath -ldflags "$(LDFLAGS)"

FORCE:

.PHONY: snapshot release
snapshot:
	docker run --rm --privileged \
		-v ~/go/pkg/mod:/go/pkg/mod \
		-v `pwd`:/go/src/github.com/datafund/fdfs \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-w /go/src/github.com/datafund/fdfs \
		ghcr.io/goreleaser/goreleaser-cross:v1.19.1 release --rm-dist \
		--skip-validate=true \
		--skip-publish

release:
	docker run --rm --privileged \
		--env-file .release-env \
		-v ~/go/pkg/mod:/go/pkg/mod \
		-v `pwd`:/go/src/github.com/datafund/fdfs \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-w /go/src/github.com/datafund/fdfs \
		ghcr.io/goreleaser/goreleaser-cross:v1.19.1 release --rm-dist
