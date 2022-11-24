package main

var (
	version        = "dev"
	commit         = "n/a"
	buildTimestamp = "n/a"
)

type about struct{}

func (*about) Version() string {
	return version + "-" + commit
}

func (*about) BuildTime() string {
	return buildTimestamp
}
