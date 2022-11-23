package main

var (
	version = "dev"
	commit  string

	// Version is used to print dfs version
	Version = func() string {
		if commit != "" {
			return version + "-" + commit
		}
		return version
	}()
)
