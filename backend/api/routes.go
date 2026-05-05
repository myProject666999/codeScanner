package api

import (
	"net/http"
	"strconv"

	"codescanner/database"
	"codescanner/models"
	"codescanner/scheduler"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	r.GET("/api/health", HealthCheck)

	api := r.Group("/api")
	{
		tokens := api.Group("/tokens")
		{
			tokens.GET("", ListTokens)
			tokens.POST("", CreateToken)
			tokens.PUT("/:id", UpdateToken)
			tokens.DELETE("/:id", DeleteToken)
		}

		tasks := api.Group("/tasks")
		{
			tasks.GET("", ListTasks)
			tasks.GET("/:id", GetTask)
			tasks.POST("", CreateTask)
			tasks.PUT("/:id", UpdateTask)
			tasks.DELETE("/:id", DeleteTask)
			tasks.POST("/:id/run", RunTaskNow)
		}

		results := api.Group("/results")
		{
			results.GET("", ListResults)
			results.GET("/:id", GetResult)
			results.PUT("/:id/handle", HandleResult)
			results.POST("/batch-handle", BatchHandleResults)
		}

		notifications := api.Group("/notifications")
		{
			notifications.GET("", ListNotifications)
			notifications.PUT("/:id", UpdateNotification)
			notifications.POST("/test", TestNotification)
		}

		proxy := api.Group("/proxy")
		{
			proxy.GET("", GetProxyConfig)
			proxy.PUT("", UpdateProxyConfig)
		}

		dashboard := api.Group("/dashboard")
		{
			dashboard.GET("/stats", GetDashboardStats)
		}
	}
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
	})
}

func ListTokens(c *gin.Context) {
	var tokens []models.GitHubToken
	if err := database.DB.Find(&tokens).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tokens)
}

func CreateToken(c *gin.Context) {
	var token models.GitHubToken
	if err := c.ShouldBindJSON(&token); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Create(&token).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, token)
}

func UpdateToken(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var token models.GitHubToken
	if err := database.DB.First(&token, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Token not found"})
		return
	}

	var updateData models.GitHubToken
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token.Token = updateData.Token
	token.IsActive = updateData.IsActive

	if err := database.DB.Save(&token).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, token)
}

func DeleteToken(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := database.DB.Delete(&models.GitHubToken{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Token deleted"})
}

func ListTasks(c *gin.Context) {
	var tasks []models.ScanTask
	if err := database.DB.Order("created_at DESC").Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func GetTask(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var task models.ScanTask
	if err := database.DB.First(&task, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}
	c.JSON(http.StatusOK, task)
}

func CreateTask(c *gin.Context) {
	var task models.ScanTask
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if task.IsActive {
		scheduler.Scheduler.AddTask(&task)
	}

	c.JSON(http.StatusOK, task)
}

func UpdateTask(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var task models.ScanTask
	if err := database.DB.First(&task, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var updateData models.ScanTask
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	oldIsActive := task.IsActive
	oldCron := task.CronExpression

	task.Name = updateData.Name
	task.Keywords = updateData.Keywords
	task.WhiteListRepos = updateData.WhiteListRepos
	task.WhiteListFiles = updateData.WhiteListFiles
	task.CronExpression = updateData.CronExpression
	task.IsActive = updateData.IsActive

	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if oldIsActive != task.IsActive || oldCron != task.CronExpression {
		scheduler.Scheduler.UpdateTask(&task)
	}

	c.JSON(http.StatusOK, task)
}

func DeleteTask(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	scheduler.Scheduler.RemoveTask(uint(id))
	if err := database.DB.Delete(&models.ScanTask{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Task deleted"})
}

func RunTaskNow(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var task models.ScanTask
	if err := database.DB.First(&task, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	go scheduler.Scheduler.RunTaskNow(&task)
	c.JSON(http.StatusOK, gin.H{"message": "Task started"})
}

func ListResults(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	taskID := c.Query("task_id")
	isHandled := c.Query("is_handled")

	var results []models.ScanResult
	var total int64

	query := database.DB.Model(&models.ScanResult{})
	if taskID != "" {
		query = query.Where("task_id = ?", taskID)
	}
	if isHandled != "" {
		query = query.Where("is_handled = ?", isHandled)
	}

	query.Count(&total)

	offset := (page - 1) * pageSize
	query.Order("scan_time DESC").Offset(offset).Limit(pageSize).Find(&results)

	c.JSON(http.StatusOK, gin.H{
		"data":      results,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func GetResult(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var result models.ScanResult
	if err := database.DB.First(&result, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Result not found"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func HandleResult(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var result models.ScanResult
	if err := database.DB.First(&result, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Result not found"})
		return
	}

	var data struct {
		IsHandled  bool   `json:"is_handled"`
		HandleNote string `json:"handle_note"`
	}

	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result.IsHandled = data.IsHandled
	result.HandleNote = data.HandleNote

	if err := database.DB.Save(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func BatchHandleResults(c *gin.Context) {
	var data struct {
		IDs        []uint `json:"ids"`
		IsHandled  bool   `json:"is_handled"`
		HandleNote string `json:"handle_note"`
	}

	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Model(&models.ScanResult{}).Where("id IN ?", data.IDs).Updates(map[string]interface{}{
		"is_handled":  data.IsHandled,
		"handle_note": data.HandleNote,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Batch update successful", "count": len(data.IDs)})
}

func ListNotifications(c *gin.Context) {
	var configs []models.NotificationConfig
	if err := database.DB.Find(&configs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, configs)
}

func UpdateNotification(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var config models.NotificationConfig
	if err := database.DB.First(&config, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification config not found"})
		return
	}

	var updateData models.NotificationConfig
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.IsEnabled = updateData.IsEnabled
	config.Config = updateData.Config

	if err := database.DB.Save(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

func TestNotification(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Test notification sent"})
}

func GetProxyConfig(c *gin.Context) {
	var config models.ProxyConfig
	if err := database.DB.First(&config).Error; err != nil {
		c.JSON(http.StatusOK, models.ProxyConfig{})
		return
	}
	c.JSON(http.StatusOK, config)
}

func UpdateProxyConfig(c *gin.Context) {
	var config models.ProxyConfig
	if err := database.DB.First(&config).Error; err != nil {
		if err := c.ShouldBindJSON(&config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := database.DB.Create(&config).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else {
		var updateData models.ProxyConfig
		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		config.Type = updateData.Type
		config.URL = updateData.URL
		config.Username = updateData.Username
		config.Password = updateData.Password
		config.IsActive = updateData.IsActive

		if err := database.DB.Save(&config).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, config)
}

func GetDashboardStats(c *gin.Context) {
	var totalTasks int64
	var activeTasks int64
	var totalResults int64
	var unhandledResults int64

	database.DB.Model(&models.ScanTask{}).Count(&totalTasks)
	database.DB.Model(&models.ScanTask{}).Where("is_active = ?", true).Count(&activeTasks)
	database.DB.Model(&models.ScanResult{}).Count(&totalResults)
	database.DB.Model(&models.ScanResult{}).Where("is_handled = ?", false).Count(&unhandledResults)

	var recentResults []models.ScanResult
	database.DB.Order("scan_time DESC").Limit(10).Find(&recentResults)

	c.JSON(http.StatusOK, gin.H{
		"total_tasks":       totalTasks,
		"active_tasks":      activeTasks,
		"total_results":     totalResults,
		"unhandled_results": unhandledResults,
		"recent_results":    recentResults,
	})
}
