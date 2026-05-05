package database

import (
	"fmt"
	"log"

	"codescanner/config"
	"codescanner/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Init() error {
	var err error

	switch config.AppConfig.Database.Driver {
	case "sqlite":
		DB, err = gorm.Open(sqlite.Open(config.AppConfig.Database.Path), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
	default:
		return fmt.Errorf("不支持的数据库驱动: %s", config.AppConfig.Database.Driver)
	}

	if err != nil {
		return fmt.Errorf("连接数据库失败: %v", err)
	}

	if err = DB.AutoMigrate(
		&models.GitHubToken{},
		&models.ScanTask{},
		&models.ScanResult{},
		&models.NotificationConfig{},
		&models.ProxyConfig{},
	); err != nil {
		return fmt.Errorf("自动迁移失败: %v", err)
	}

	log.Println("数据库初始化成功")
	return nil
}

func GetDB() *gorm.DB {
	return DB
}
