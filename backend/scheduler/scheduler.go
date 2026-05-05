package scheduler

import (
	"log"
	"sync"

	"codescanner/database"
	"codescanner/models"
	"codescanner/scanner"

	"github.com/robfig/cron/v3"
)

type TaskScheduler struct {
	cron    *cron.Cron
	taskMap map[uint]cron.EntryID
	mu      sync.Mutex
}

var Scheduler *TaskScheduler

func Init() {
	Scheduler = &TaskScheduler{
		cron:    cron.New(),
		taskMap: make(map[uint]cron.EntryID),
	}

	var tasks []models.ScanTask
	if err := database.DB.Where("is_active = ?", true).Find(&tasks).Error; err != nil {
		log.Printf("获取扫描任务失败: %v", err)
		return
	}

	for _, task := range tasks {
		Scheduler.AddTask(&task)
	}

	Scheduler.cron.Start()
	log.Println("任务调度器已启动")
}

func (s *TaskScheduler) AddTask(task *models.ScanTask) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.taskMap[task.ID]; exists {
		s.cron.Remove(s.taskMap[task.ID])
	}

	entryID, err := s.cron.AddFunc(task.CronExpression, func() {
		log.Printf("开始执行扫描任务: %s", task.Name)
		if err := scanner.RunScanTask(task); err != nil {
			log.Printf("扫描任务执行失败: %v", err)
		} else {
			log.Printf("扫描任务执行完成: %s", task.Name)
		}
	})

	if err != nil {
		return err
	}

	s.taskMap[task.ID] = entryID
	log.Printf("已添加定时任务: %s (Cron: %s)", task.Name, task.CronExpression)
	return nil
}

func (s *TaskScheduler) RemoveTask(taskID uint) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entryID, exists := s.taskMap[taskID]; exists {
		s.cron.Remove(entryID)
		delete(s.taskMap, taskID)
		log.Printf("已移除定时任务: %d", taskID)
	}
}

func (s *TaskScheduler) UpdateTask(task *models.ScanTask) error {
	s.RemoveTask(task.ID)
	if task.IsActive {
		return s.AddTask(task)
	}
	return nil
}

func (s *TaskScheduler) RunTaskNow(task *models.ScanTask) error {
	log.Printf("立即执行扫描任务: %s", task.Name)
	return scanner.RunScanTask(task)
}

func Stop() {
	if Scheduler != nil && Scheduler.cron != nil {
		Scheduler.cron.Stop()
		log.Println("任务调度器已停止")
	}
}
