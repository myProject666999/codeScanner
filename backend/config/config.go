package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

type Config struct {
	Server        ServerConfig
	Database      DatabaseConfig
	GitHub        GitHubConfig
	Notifications NotificationsConfig
}

type ServerConfig struct {
	Port int
	Mode string
}

type DatabaseConfig struct {
	Driver string
	Path   string
}

type GitHubConfig struct {
	Proxy     string
	RateLimit int
}

type NotificationsConfig struct {
	Email    EmailConfig
	DingTalk DingTalkConfig
	Feishu   FeishuConfig
	Webhook  WebhookConfig
	Telegram TelegramConfig
	Wechat   WechatConfig
}

type EmailConfig struct {
	Enabled    bool
	SMTPHost   string
	SMTPPort   int
	Sender     string
	Password   string
	Recipients []string
}

type DingTalkConfig struct {
	Enabled bool
	Webhook string
	Secret  string
}

type FeishuConfig struct {
	Enabled bool
	Webhook string
}

type WebhookConfig struct {
	Enabled bool
	URL     string
	Method  string
}

type TelegramConfig struct {
	Enabled  bool
	BotToken string
	ChatIDs  []string
}

type WechatConfig struct {
	Enabled bool
	Webhook string
}

var AppConfig *Config

func Init() error {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			return fmt.Errorf("配置文件未找到: %v", err)
		}
		return fmt.Errorf("读取配置文件失败: %v", err)
	}

	AppConfig = &Config{}
	if err := viper.Unmarshal(AppConfig); err != nil {
		return fmt.Errorf("解析配置文件失败: %v", err)
	}

	envPort := os.Getenv("PORT")
	if envPort != "" {
		viper.Set("server.port", envPort)
		AppConfig.Server.Port = viper.GetInt("server.port")
	}

	return nil
}
