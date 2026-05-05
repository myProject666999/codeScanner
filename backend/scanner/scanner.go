package scanner

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"codescanner/config"
	"codescanner/database"
	"codescanner/models"
	"codescanner/notifier"

	"github.com/google/go-github/v57/github"
	"golang.org/x/oauth2"
)

type GitHubScanner struct {
	client *github.Client
	ctx    context.Context
}

func NewGitHubScanner(token string) (*GitHubScanner, error) {
	ctx := context.Background()
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: token},
	)
	tc := oauth2.NewClient(ctx, ts)

	if config.AppConfig.GitHub.Proxy != "" {
		proxyURL, err := url.Parse(config.AppConfig.GitHub.Proxy)
		if err == nil {
			tc.Transport = &http.Transport{
				Proxy: http.ProxyURL(proxyURL),
			}
		}
	}

	client := github.NewClient(tc)

	return &GitHubScanner{
		client: client,
		ctx:    ctx,
	}, nil
}

func (s *GitHubScanner) SearchCode(keyword string, opts *github.SearchOptions) (*github.CodeSearchResult, *github.Response, error) {
	return s.client.Search.Code(s.ctx, keyword, opts)
}

func RunScanTask(task *models.ScanTask) error {
	var tokens []models.GitHubToken
	if err := database.DB.Where("is_active = ?", true).Find(&tokens).Error; err != nil {
		return fmt.Errorf("获取GitHub令牌失败: %v", err)
	}

	if len(tokens) == 0 {
		return fmt.Errorf("没有可用的GitHub令牌")
	}

	var selectedToken *models.GitHubToken
	for i := range tokens {
		if tokens[i].RateUsed < tokens[i].RateLimit {
			selectedToken = &tokens[i]
			break
		}
	}

	if selectedToken == nil {
		return fmt.Errorf("所有GitHub令牌的速率限制已用尽")
	}

	scanner, err := NewGitHubScanner(selectedToken.Token)
	if err != nil {
		return fmt.Errorf("创建GitHub扫描器失败: %v", err)
	}

	keywords := strings.Split(task.Keywords, ",")
	whiteListRepos := strings.Split(task.WhiteListRepos, ",")
	whiteListFiles := strings.Split(task.WhiteListFiles, ",")

	whiteListRepoMap := make(map[string]bool)
	for _, repo := range whiteListRepos {
		if repo = strings.TrimSpace(repo); repo != "" {
			whiteListRepoMap[repo] = true
		}
	}

	whiteListFileMap := make(map[string]bool)
	for _, file := range whiteListFiles {
		if file = strings.TrimSpace(file); file != "" {
			whiteListFileMap[file] = true
		}
	}

	now := time.Now()
	var newResults []*models.ScanResult

	for _, keyword := range keywords {
		keyword = strings.TrimSpace(keyword)
		if keyword == "" {
			continue
		}

		opts := &github.SearchOptions{
			ListOptions: github.ListOptions{PerPage: 100},
		}

		for {
			result, resp, err := scanner.SearchCode(keyword, opts)
			if err != nil {
				if _, ok := err.(*github.RateLimitError); ok {
					selectedToken.RateUsed = selectedToken.RateLimit
					database.DB.Save(selectedToken)
					break
				}
				return fmt.Errorf("搜索代码失败: %v", err)
			}

			selectedToken.RateUsed = resp.Rate.Remaining

			for _, codeResult := range result.CodeResults {
				repoName := codeResult.GetRepository().GetFullName()
				filePath := codeResult.GetPath()

				if whiteListRepoMap[repoName] {
					continue
				}

				isWhiteListed := false
				for pattern := range whiteListFileMap {
					if strings.Contains(filePath, pattern) {
						isWhiteListed = true
						break
					}
				}
				if isWhiteListed {
					continue
				}

				var existingResult models.ScanResult
				if err := database.DB.Where(
					"task_id = ? AND repo_name = ? AND file_path = ? AND keyword = ?",
					task.ID, repoName, filePath, keyword,
				).First(&existingResult).Error; err == nil {
					continue
				}

				newResult := &models.ScanResult{
					TaskID:    task.ID,
					RepoName:  repoName,
					RepoURL:   codeResult.GetRepository().GetHTMLURL(),
					FilePath:  filePath,
					FileURL:   codeResult.GetHTMLURL(),
					MatchText: fmt.Sprintf("匹配关键词: %s", keyword),
					Keyword:   keyword,
					IsHandled: false,
					ScanTime:  now,
				}
				newResults = append(newResults, newResult)
			}

			if resp.NextPage == 0 {
				break
			}
			opts.Page = resp.NextPage
		}
	}

	if len(newResults) > 0 {
		for _, result := range newResults {
			if err := database.DB.Create(result).Error; err != nil {
				return fmt.Errorf("保存扫描结果失败: %v", err)
			}
		}

		notificationData := map[string]interface{}{
			"task_name":   task.Name,
			"result_count": len(newResults),
			"results":     newResults,
		}

		jsonData, _ := json.Marshal(notificationData)
		notifier.SendAllNotification("代码泄露扫描结果", string(jsonData))
	}

	database.DB.Save(selectedToken)

	task.LastScanTime = &now
	cronExpr := task.CronExpression
	nextTime, err := calculateNextRunTime(cronExpr, now)
	if err == nil {
		task.NextScanTime = &nextTime
	}
	database.DB.Save(task)

	return nil
}

func calculateNextRunTime(cronExpr string, now time.Time) (time.Time, error) {
	parts := strings.Fields(cronExpr)
	if len(parts) < 5 {
		return now, fmt.Errorf("无效的cron表达式")
	}

	nextHour := now.Add(1 * time.Hour)
	return nextHour, nil
}
