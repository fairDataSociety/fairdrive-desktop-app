package main

import (
	"encoding/hex"
	"os"
	"path/filepath"

	"github.com/mitchellh/go-homedir"
	"github.com/spf13/viper"
)

const (
	creds = ".fda.remember.yaml"
)

type Account struct {
	Username string
	Password string
}

func newAccount() *Account {
	config := viper.New()
	acc := &Account{}
	home, err := homedir.Dir()
	if err != nil {
		return acc
	}
	cfgFile := filepath.Join(home, creds)
	if _, err := os.Stat(cfgFile); err == nil {
		config.SetConfigFile(cfgFile)
		if err := config.ReadInConfig(); err != nil {
			return acc
		}
		passwordHex := config.GetString("password")
		pass, err := hex.DecodeString(passwordHex)
		if err != nil {
			return acc
		}
		userHex := config.GetString("username")
		username, err := hex.DecodeString(userHex)
		if err != nil {
			return acc
		}
		acc.Password = string(pass)
		acc.Username = string(username)
	}
	return acc
}

func (a *Account) RememberPassword(username, password string) error {
	config := viper.New()
	passwordHex := hex.EncodeToString([]byte(password))
	userHex := hex.EncodeToString([]byte(username))
	config.Set("username", userHex)
	config.Set("password", passwordHex)
	home, err := homedir.Dir()
	if err != nil {
		return err
	}
	cfgFile := filepath.Join(home, creds)
	return config.WriteConfigAs(cfgFile)
}

func (a *Account) ForgetPassword() error {
	home, err := homedir.Dir()
	if err != nil {
		return err
	}
	cfgFile := filepath.Join(home, creds)
	if _, err := os.Stat(cfgFile); err == nil {
		return os.Remove(cfgFile)
	}
	return err
}

func (a *Account) HasRemembered() bool {
	if a.Username != "" && a.Password != "" {
		return true
	}
	return false
}

func (a *Account) Get() *Account {
	return a
}
