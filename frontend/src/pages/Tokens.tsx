import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Switch, Popconfirm, message, Progress, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { tokenApi, GitHubToken } from '../services/api'
import dayjs from 'dayjs'

interface TokenFormData {
  token: string
  rate_limit: number
  is_active: boolean
}

function Tokens() {
  const [tokens, setTokens] = useState<GitHubToken[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingToken, setEditingToken] = useState<GitHubToken | null>(null)
  const [form] = Form.useForm<TokenFormData>()

  const fetchTokens = async () => {
    setLoading(true)
    try {
      const response = await tokenApi.list()
      setTokens(response.data)
    } catch (error) {
      message.error('获取令牌列表失败')
      console.error('Failed to fetch tokens:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTokens()
  }, [])

  const handleAdd = () => {
    setEditingToken(null)
    form.resetFields()
    form.setFieldsValue({ rate_limit: 5000, is_active: true })
    setModalVisible(true)
  }

  const handleEdit = (record: GitHubToken) => {
    setEditingToken(record)
    form.setFieldsValue({
      token: record.token,
      rate_limit: record.rate_limit,
      is_active: record.is_active,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await tokenApi.delete(id)
      message.success('删除成功')
      fetchTokens()
    } catch (error) {
      message.error('删除失败')
      console.error('Failed to delete token:', error)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingToken) {
        await tokenApi.update(editingToken.id, values)
        message.success('更新成功')
      } else {
        await tokenApi.create(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchTokens()
    } catch (error) {
      console.error('Failed to save token:', error)
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
      title: '令牌',
      dataIndex: 'token',
      key: 'token',
      render: (token: string) => (
        <span style={{ fontFamily: 'monospace' }}>
          {token.slice(0, 10)}...{token.slice(-5)}
        </span>
      ),
    },
    {
      title: '速率限制',
      dataIndex: 'rate_used',
      key: 'rate_used',
      render: (used: number, record: GitHubToken) => {
        const percentage = (used / record.rate_limit) * 100
        const status = percentage > 80 ? 'exception' : percentage > 50 ? 'active' : 'normal'
        return (
          <Progress
            percent={Math.round(percentage)}
            status={status}
            format={() => `${used}/${record.rate_limit}`}
          />
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: GitHubToken) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个令牌吗？"
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
        <h2 style={{ margin: 0 }}>令牌管理</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchTokens} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加令牌
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={tokens}
        rowKey="id"
        loading={loading}
        scroll={{ x: 800 }}
      />

      <Modal
        title={editingToken ? '编辑令牌' : '添加令牌'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="token"
            label="GitHub 令牌"
            rules={[{ required: true, message: '请输入GitHub令牌' }]}
          >
            <Input.Password placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxx" />
          </Form.Item>
          <Form.Item
            name="rate_limit"
            label="速率限制"
            rules={[{ required: true, message: '请输入速率限制' }]}
          >
            <Input.Number style={{ width: '100%' }} min={0} max={5000} />
          </Form.Item>
          <Form.Item name="is_active" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Tokens
