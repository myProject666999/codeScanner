import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  message,
  Tag,
  Checkbox,
  Badge,
  Card,
} from 'antd'
import { ReloadOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { resultApi, ScanResult } from '../services/api'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

interface FilterParams {
  page: number
  page_size: number
  task_id?: number
  is_handled?: string
}

function Results() {
  const [results, setResults] = useState<ScanResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null)
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    page_size: 20,
  })
  const [form] = Form.useForm()

  const fetchResults = async () => {
    setLoading(true)
    try {
      const response = await resultApi.list(filters)
      setResults(response.data.data)
      setTotal(response.data.total)
    } catch (error) {
      message.error('获取扫描结果失败')
      console.error('Failed to fetch results:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
  }, [filters])

  const handleFilterChange = (key: keyof FilterParams, value: number | string | undefined) => {
    setFilters((prev) => ({ ...prev, page: 1, [key]: value }))
  }

  const handlePageChange = (page: number, pageSize: number) => {
    setFilters((prev) => ({ ...prev, page, page_size: pageSize }))
  }

  const handleViewDetail = (record: ScanResult) => {
    setSelectedResult(record)
    form.setFieldsValue({
      is_handled: record.is_handled,
      handle_note: record.handle_note || '',
    })
    setDetailModalVisible(true)
  }

  const handleSaveDetail = async () => {
    if (!selectedResult) return
    try {
      const values = await form.validateFields()
      await resultApi.handle(selectedResult.id, {
        is_handled: values.is_handled,
        handle_note: values.handle_note,
      })
      message.success('更新成功')
      setDetailModalVisible(false)
      fetchResults()
    } catch (error) {
      console.error('Failed to save result:', error)
    }
  }

  const handleBatchHandle = async (isHandled: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要处理的记录')
      return
    }

    Modal.confirm({
      title: '批量处理确认',
      icon: isHandled ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />,
      content: `确定要将选中的 ${selectedRowKeys.length} 条记录标记为${isHandled ? '已处理' : '未处理'}吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await resultApi.batchHandle({
            ids: selectedRowKeys.map(Number),
            is_handled: isHandled,
          })
          message.success(`已成功处理 ${selectedRowKeys.length} 条记录`)
          setSelectedRowKeys([])
          fetchResults()
        } catch (error) {
          message.error('批量处理失败')
          console.error('Failed to batch handle:', error)
        }
      },
    })
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys)
    },
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '仓库',
      dataIndex: 'repo_name',
      key: 'repo_name',
      ellipsis: true,
      width: 200,
      render: (name: string, record: ScanResult) => (
        <a href={record.repo_url} target="_blank" rel="noopener noreferrer">
          {name}
        </a>
      ),
    },
    {
      title: '文件路径',
      dataIndex: 'file_path',
      key: 'file_path',
      ellipsis: true,
      width: 250,
      render: (path: string, record: ScanResult) => (
        <a href={record.file_url} target="_blank" rel="noopener noreferrer">
          {path}
        </a>
      ),
    },
    {
      title: '匹配关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      width: 120,
      render: (keyword: string) => (
        <Tag color="orange">{keyword}</Tag>
      ),
    },
    {
      title: '处理状态',
      dataIndex: 'is_handled',
      key: 'is_handled',
      width: 100,
      render: (isHandled: boolean) => (
        isHandled ? (
          <Badge status="success" text="已处理" />
        ) : (
          <Badge status="error" text="未处理" />
        )
      ),
      filters: [
        { text: '未处理', value: 'false' },
        { text: '已处理', value: 'true' },
      ],
      filteredValue: filters.is_handled ? [filters.is_handled] : null,
      onFilter: (value: string | number | boolean) => {
        handleFilterChange('is_handled', String(value))
      },
    },
    {
      title: '扫描时间',
      dataIndex: 'scan_time',
      key: 'scan_time',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: unknown, record: ScanResult) => (
        <Space>
          <Button type="link" onClick={() => handleViewDetail(record)}>
            详情
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap' as const,
          gap: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>扫描结果</h2>
        <Space>
          {selectedRowKeys.length > 0 && (
            <>
              <Button
                type="primary"
                onClick={() => handleBatchHandle(true)}
              >
                标记已处理 ({selectedRowKeys.length})
              </Button>
              <Button onClick={() => handleBatchHandle(false)}>
                标记未处理
              </Button>
            </>
          )}
          <Button icon={<ReloadOutlined />} onClick={fetchResults} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontWeight: 500 }}>过滤条件：</span>
          <Select
            placeholder="处理状态"
            allowClear
            style={{ width: 150 }}
            value={filters.is_handled || undefined}
            onChange={(value) => handleFilterChange('is_handled', value)}
          >
            <Option value="false">未处理</Option>
            <Option value="true">已处理</Option>
          </Select>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={results}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        scroll={{ x: 1000 }}
        pagination={{
          current: filters.page,
          pageSize: filters.page_size,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: handlePageChange,
          onShowSizeChange: handlePageChange,
        }}
      />

      <Modal
        title="扫描结果详情"
        open={detailModalVisible}
        onOk={handleSaveDetail}
        onCancel={() => setDetailModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={700}
      >
        {selectedResult && (
          <Form form={form} layout="vertical">
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>仓库：</strong>
                <a href={selectedResult.repo_url} target="_blank" rel="noopener noreferrer">
                  {selectedResult.repo_name}
                </a>
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>文件：</strong>
                <a href={selectedResult.file_url} target="_blank" rel="noopener noreferrer">
                  {selectedResult.file_path}
                </a>
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>匹配关键词：</strong>
                <Tag color="orange">{selectedResult.keyword}</Tag>
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>扫描时间：</strong>
                {dayjs(selectedResult.scan_time).format('YYYY-MM-DD HH:mm:ss')}
              </div>
            </div>

            <Form.Item
              name="is_handled"
              label="处理状态"
              valuePropName="checked"
            >
              <Checkbox>标记为已处理</Checkbox>
            </Form.Item>

            <Form.Item
              name="handle_note"
              label="处理备注"
            >
              <TextArea rows={4} placeholder="请输入处理备注..." />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default Results
