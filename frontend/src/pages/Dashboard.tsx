import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Space, Button } from 'antd'
import {
  SearchOutlined,
  PlayCircleOutlined,
  AlertOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { dashboardApi, DashboardStats } from '../services/api'
import dayjs from 'dayjs'

interface RecentResult {
  key: number
  id: number
  repoName: string
  filePath: string
  keyword: string
  isHandled: boolean
  scanTime: string
}

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await dashboardApi.getStats()
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const columns = [
    {
      title: '仓库',
      dataIndex: 'repoName',
      key: 'repoName',
      ellipsis: true,
      width: 200,
    },
    {
      title: '文件路径',
      dataIndex: 'filePath',
      key: 'filePath',
      ellipsis: true,
      width: 250,
    },
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
    },
    {
      title: '状态',
      dataIndex: 'isHandled',
      key: 'isHandled',
      render: (isHandled: boolean) => (
        <Tag color={isHandled ? 'success' : 'error'}>
          {isHandled ? '已处理' : '未处理'}
        </Tag>
      ),
    },
    {
      title: '扫描时间',
      dataIndex: 'scanTime',
      key: 'scanTime',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const recentResults: RecentResult[] = stats?.recent_results?.map((result) => ({
    key: result.id,
    id: result.id,
    repoName: result.repo_name,
    filePath: result.file_path,
    keyword: result.keyword,
    isHandled: result.is_handled,
    scanTime: result.scan_time,
  })) || []

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>仪表盘</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchStats} loading={loading}>
          刷新
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="总任务数"
              value={stats?.total_tasks || 0}
              prefix={<SearchOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="运行中任务"
              value={stats?.active_tasks || 0}
              prefix={<PlayCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="总扫描结果"
              value={stats?.total_results || 0}
              prefix={<AlertOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="待处理结果"
              value={stats?.unhandled_results || 0}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="最近扫描结果"
        style={{ marginTop: 24 }}
        loading={loading}
        extra={
          <Space>
            <Tag color="error">未处理</Tag>
            <Tag color="success">已处理</Tag>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={recentResults}
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  )
}

export default Dashboard
