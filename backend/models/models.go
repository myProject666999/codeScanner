package models

import (
	"time"

	"gorm.io/gorm"
)

type GitHubToken struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Token       string         `gorm:"uniqueIndex;not null" json:"token"`
	RateLimit   int            `gorm:"default:5000" json:"rate_limit"`
	RateUsed    int            `gorm:"default:0" json:"rate_used"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type ScanTask struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	Name            string         `gorm:"not null" json:"name"`
	Keywords        string         `gorm:"not null" json:"keywords"`
	WhiteListRepos  string         `json:"white_list_repos"`
	WhiteListFiles  string         `json:"white_list_files"`
	CronExpression  string         `gorm:"not null" json:"cron_expression"`
	IsActive        bool           `gorm:"default:true" json:"is_active"`
	LastScanTime    *time.Time     `json:"last_scan_time"`
	NextScanTime    *time.Time     `json:"next_scan_time"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

type ScanResult struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	TaskID      uint           `gorm:"not null" json:"task_id"`
	Task        ScanTask       `gorm:"foreignKey:TaskID" json:"-"`
	RepoName    string         `gorm:"not null" json:"repo_name"`
	RepoURL     string         `gorm:"not null" json:"repo_url"`
	FilePath    string         `gorm:"not null" json:"file_path"`
	FileURL     string         `gorm:"not null" json:"file_url"`
	MatchText   string         `gorm:"not null" json:"match_text"`
	Keyword     string         `gorm:"not null" json:"keyword"`
	IsHandled   bool           `gorm:"default:false" json:"is_handled"`
	HandleNote  string         `json:"handle_note"`
	ScanTime    time.Time      `gorm:"not null" json:"scan_time"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type NotificationConfig struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Type         string         `gorm:"uniqueIndex;not null" json:"type"`
	IsEnabled    bool           `gorm:"default:false" json:"is_enabled"`
	Config       string         `json:"config"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type ProxyConfig struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Type      string         `gorm:"default:http" json:"type"`
	URL       string         `json:"url"`
	Username  string         `json:"username"`
	Password  string         `json:"password"`
	IsActive  bool           `gorm:"default:false" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
