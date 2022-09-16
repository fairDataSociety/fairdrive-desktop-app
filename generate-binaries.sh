#!/usr/bin/env bash

package_name=dfs
platforms=("darwin/amd64" "linux/386" "linux/amd64" "linux/arm64" "windows/amd64" "windows/386")
COMMIT=$(git describe --long --dirty --always --match "")


echo "$COMMIT"


for platform in "${platforms[@]}"
do
    platform_split=(${platform//\// })
    GOOS=${platform_split[0]}
    GOARCH=${platform_split[1]}
    output_name=./dist/$package_name'-'$GOOS'-'$GOARCH
    if [ "$GOOS" = "windows" ]; then
        output_name+='.exe'
    fi

    echo "generating $output_name"
    env GOOS="$GOOS" GOARCH="$GOARCH"  go build -trimpath -ldflags "-s -w -X github.com/datafund/fdfs.commit=$COMMIT" -o $output_name ./cmd/dfs
    if [ $? -ne 0 ]; then
        echo 'An error has occurred! Aborting the script execution...'
        exit 1
    fi
done