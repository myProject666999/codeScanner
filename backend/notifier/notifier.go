package notifier

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/smtp"
	"strconv"
	"time"

	"codescanner/config"
)

type Notifier interface {
	Send(title, message string) error
}

type EmailNotifier struct {
	config config.EmailConfig
}

type DingTalkNotifier struct {
	config config.DingTalkConfig
}

type FeishuNotifier struct {
	config config.FeishuConfig
}

type WebhookNotifier struct {
	config config.WebhookConfig
}

type TelegramNotifier struct {
	config config.TelegramConfig
}

type WechatNotifier struct {
	config config.WechatConfig
}

func NewEmailNotifier(cfg config.EmailConfig) *EmailNotifier {
	return &EmailNotifier{config: cfg}
}

func (n *EmailNotifier) Send(title, message string) error {
	auth := smtp.PlainAuth("", n.config.Sender, n.config.Password, n.config.SMTPHost)
	addr := fmt.Sprintf("%s:%d", n.config.SMTPHost, n.config.SMTPPort)

	body := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
		n.config.Sender, n.config.Recipients[0], title, message)

	return smtp.SendMail(addr, auth, n.config.Sender, n.config.Recipients, []byte(body))
}

func NewDingTalkNotifier(cfg config.DingTalkConfig) *DingTalkNotifier {
	return &DingTalkNotifier{config: cfg}
}

func (n *DingTalkNotifier) Send(title, message string) error {
	timestamp := strconv.FormatInt(time.Now().UnixMilli(), 10)
	stringToSign := fmt.Sprintf("%s\n%s", timestamp, n.config.Secret)

	h := hmac.New(sha256.New, []byte(n.config.Secret))
	h.Write([]byte(stringToSign))
	sign := base64.StdEncoding.EncodeToString(h.Sum(nil))

	url := fmt.Sprintf("%s&timestamp=%s&sign=%s", n.config.Webhook, timestamp, sign)

	payload := map[string]interface{}{
		"msgtype": "markdown",
		"markdown": map[string]string{
			"title": title,
			"text":  message,
		},
	}

	jsonData, _ := json.Marshal(payload)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

func NewFeishuNotifier(cfg config.FeishuConfig) *FeishuNotifier {
	return &FeishuNotifier{config: cfg}
}

func (n *FeishuNotifier) Send(title, message string) error {
	payload := map[string]interface{}{
		"msg_type": "text",
		"content": map[string]string{
			"text": fmt.Sprintf("%s\n%s", title, message),
		},
	}

	jsonData, _ := json.Marshal(payload)
	resp, err := http.Post(n.config.Webhook, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

func NewWebhookNotifier(cfg config.WebhookConfig) *WebhookNotifier {
	return &WebhookNotifier{config: cfg}
}

func (n *WebhookNotifier) Send(title, message string) error {
	payload := map[string]interface{}{
		"title":   title,
		"message": message,
		"time":    time.Now().Format(time.RFC3339),
	}

	jsonData, _ := json.Marshal(payload)

	var req *http.Request
	var err error

	if n.config.Method == "GET" {
		req, err = http.NewRequest("GET", n.config.URL, nil)
	} else {
		req, err = http.NewRequest("POST", n.config.URL, bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
	}

	if err != nil {
		return err
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

func NewTelegramNotifier(cfg config.TelegramConfig) *TelegramNotifier {
	return &TelegramNotifier{config: cfg}
}

func (n *TelegramNotifier) Send(title, message string) error {
	text := fmt.Sprintf("%s\n\n%s", title, message)

	for _, chatID := range n.config.ChatIDs {
		url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", n.config.BotToken)
		payload := map[string]interface{}{
			"chat_id": chatID,
			"text":    text,
		}

		jsonData, _ := json.Marshal(payload)
		resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			continue
		}
		resp.Body.Close()
	}

	return nil
}

func NewWechatNotifier(cfg config.WechatConfig) *WechatNotifier {
	return &WechatNotifier{config: cfg}
}

func (n *WechatNotifier) Send(title, message string) error {
	payload := map[string]interface{}{
		"msgtype": "markdown",
		"markdown": map[string]interface{}{
			"content": fmt.Sprintf("### %s\n%s", title, message),
		},
	}

	jsonData, _ := json.Marshal(payload)
	resp, err := http.Post(n.config.Webhook, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

func SendAllNotification(title, message string) {
	if config.AppConfig.Notifications.Email.Enabled {
		notifier := NewEmailNotifier(config.AppConfig.Notifications.Email)
		notifier.Send(title, message)
	}

	if config.AppConfig.Notifications.DingTalk.Enabled {
		notifier := NewDingTalkNotifier(config.AppConfig.Notifications.DingTalk)
		notifier.Send(title, message)
	}

	if config.AppConfig.Notifications.Feishu.Enabled {
		notifier := NewFeishuNotifier(config.AppConfig.Notifications.Feishu)
		notifier.Send(title, message)
	}

	if config.AppConfig.Notifications.Webhook.Enabled {
		notifier := NewWebhookNotifier(config.AppConfig.Notifications.Webhook)
		notifier.Send(title, message)
	}

	if config.AppConfig.Notifications.Telegram.Enabled {
		notifier := NewTelegramNotifier(config.AppConfig.Notifications.Telegram)
		notifier.Send(title, message)
	}

	if config.AppConfig.Notifications.Wechat.Enabled {
		notifier := NewWechatNotifier(config.AppConfig.Notifications.Wechat)
		notifier.Send(title, message)
	}
}
