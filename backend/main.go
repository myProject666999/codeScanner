package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"codescanner/api"
	"codescanner/config"
	"codescanner/database"
	"codescanner/scheduler"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	if err := config.Init(); err != nil {
		log.Fatalf("配置初始化失败: %v", err)
	}

	if err := database.Init(); err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}

	scheduler.Init()

	gin.SetMode(config.AppConfig.Server.Mode)
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	api.SetupRoutes(r)

	go func() {
		addr := fmt.Sprintf(":%d", config.AppConfig.Server.Port)
		log.Printf("服务器启动在端口 %d", config.AppConfig.Server.Port)
		if err := r.Run(addr); err != nil {
			log.Fatalf("服务器启动失败: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("正在关闭服务器...")
	scheduler.Stop()
	log.Println("服务器已关闭")
}
