import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Switch, Popconfirm, message, Tag, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { taskApi, ScanTask } from '../services/api'
import dayjs from 'dayjs'

interface TaskFormData {
  name: string
  keywords: string
  white_list_repos: string
  white_list_files: string
  cron_expression: string
  is_active: boolean
}

function Tasks() {
  const [tasks, setTasks] = useState<ScanTask[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingTask, setEditingTask] = useState<ScanTask | null>(null)
  const [form] = Form.useForm<TaskFormData>()

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const response = await taskApi.list()
      setTasks(response.data)
    } catch (error) {
      message.error('获取任务列表失败')
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleAdd = () => {
    setEditingTask(null)
    form.resetFields()
    form.setFieldsValue({ 
      cron_expression: '0 */6 * * *',
      is_active: true 
    })
    setModalVisible(true)
  }

  const handleEdit = (record: ScanTask) => {
    setEditingTask(record)
    form.setFieldsValue({
      name: record.name,
      keywords: record.keywords,
      white_list_repos: record.white_list_repos || '',
      white_list_files: record.white_list_files || '',
      cron_expression: record.cron_expression,
      is_active: record.is_active,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await taskApi.delete(id)
      message.success('删除成功')
      fetchTasks()
    } catch (error) {
      message.error('删除失败')
      console.error('Failed to delete task:', error)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingTask) {
        await taskApi.update(editingTask.id, values)
        message.success('更新成功')
      } else {
        await taskApi.create(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchTasks()
    } catch (error) {
      console.error('Failed to save task:', error)
    }
  }

  const handleRunNow = async (record: ScanTask) => {
    try {
      await taskApi.run(record.id)
      message.success('任务已启动')
    } catch (error) {
      message.error('启动任务失败')
      console.error('Failed to run task:', error)
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '关键词',
      dataIndex: 'keywords',
      key: 'keywords',
      ellipsis: true,
      render: (keywords: string) => (
        <Tooltip title={keywords}>
          {keywords.length > 30 ? keywords.slice(0, 30) + '...' : keywords}
        </Tooltip>
      ),
    },
    {
      title: 'Cron表达式',
      dataIndex: 'cron_expression',
      key: 'cron_expression',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '运行中' : '已停止'}
        </Tag>
      ),
    },
    {
      title: '上次扫描',
      dataIndex: 'last_scan_time',
      key: 'last_scan_time',
      render: (time: string | null) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '下次扫描',
      dataIndex: 'next_scan_time',
      key: 'next_scan_time',
      render: (time: string | null) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 200,
      render: (_: unknown, record: ScanTask) => (
        <Space>
          <Button
            type="link"
            icon={<PlayCircleOutlined />}
            onClick={() => handleRunNow(record)}
          >
            立即运行
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个任务吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
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
        }}
      >
        <h2 style={{ margin: 0 }}>扫描任务</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建任务
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingTask ? '编辑任务' : '新建任务'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="例如：API密钥监控" />
          </Form.Item>
          <Form.Item
            name="keywords"
            label="搜索关键词"
            rules={[{ required: true, message: '请输入搜索关键词' }]}
            help="多个关键词用逗号分隔，例如：api_key,secret_key,password"
          >
            <Input.TextArea rows={3} placeholder="例如：api_key,secret_key,password" />
          </Form.Item>
          <Form.Item
            name="white_list_repos"
            label="仓库白名单"
            help="白名单中的仓库将被跳过扫描，多个仓库用逗号分隔"
          >
            <Input.TextArea rows={2} placeholder="例如：myorg/private-repo,anotherorg/secret-repo" />
          </Form.Item>
          <Form.Item
            name="white_list_files"
            label="文件白名单"
            help="包含指定关键词的文件将被跳过扫描，多个关键词用逗号分隔"
          >
            <Input.TextArea rows={2} placeholder="例如：.md,test_,README" />
          </Form.Item>
          <Form.Item
            name="cron_expression"
            label="定时表达式"
            rules={[{ required: true, message: '请输入Cron表达式' }]}
            help="Cron表达式，例如：0 */6 * * * 表示每6小时执行一次"
          >
            <Input placeholder="0 */6 * * *" />
          </Form.Item>
          <Form.Item name="is_active" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Tasks
