//go:build darwin
// +build darwin

package main

import (
	"os/exec"
)

func open(input string) *exec.Cmd {
	return exec.Command("open", input)
}
