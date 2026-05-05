import { useState, useEffect } from 'react'
import { Card, Form, Input, Switch, Button, Select, message } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { proxyApi, ProxyConfig } from '../services/api'

const { Option } = Select

function Proxy() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<ProxyConfig>()

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const response = await proxyApi.get()
      const config = response.data
      form.setFieldsValue(config)
    } catch (error) {
      console.error('Failed to fetch proxy config:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await proxyApi.update(values)
      message.success('代理配置保存成功')
    } catch (error) {
      message.error('保存代理配置失败')
      console.error('Failed to save proxy config:', error)
    } finally {
      setSaving(false)
    }
  }

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
        <h2 style={{ margin: 0 }}>代理配置</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchConfig} loading={loading}>
          刷新
        </Button>
      </div>

      <Card
        title="GitHub API 代理设置"
        loading={loading}
        style={{ maxWidth: 600 }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: 'http',
            is_active: false,
          }}
        >
          <Form.Item
            name="is_active"
            label="启用代理"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item
            name="type"
            label="代理类型"
            rules={[{ required: true, message: '请选择代理类型' }]}
          >
            <Select placeholder="选择代理类型">
              <Option value="http">HTTP</Option>
              <Option value="https">HTTPS</Option>
              <Option value="socks5">SOCKS5</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="url"
            label="代理地址"
            rules={[{ required: true, message: '请输入代理地址' }]}
            help="格式：http://127.0.0.1:7890 或 socks5://127.0.0.1:1080"
          >
            <Input placeholder="http://127.0.0.1:7890" />
          </Form.Item>

          <Form.Item
            name="username"
            label="用户名（可选）"
          >
            <Input placeholder="代理用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码（可选）"
          >
            <Input.Password placeholder="代理密码" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
            >
              保存配置
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
          <h4 style={{ marginBottom: 8 }}>使用说明</h4>
          <ul style={{ paddingLeft: 20, color: '#666', fontSize: 14 }}>
            <li style={{ marginBottom: 4 }}>
              代理配置用于访问 GitHub API，解决网络访问问题
            </li>
            <li style={{ marginBottom: 4 }}>
              常见代理类型：HTTP 代理（如 V2Ray、Clash 的 HTTP 端口）、SOCKS5 代理
            </li>
            <li style={{ marginBottom: 4 }}>
              本地代理地址通常为：http://127.0.0.1:7890 或 socks5://127.0.0.1:1080
            </li>
            <li>
              代理用户名和密码为可选配置，仅当代理需要认证时填写
            </li>
          </ul>
        </div>
      </Card>
    </div>
  )
}

export default Proxy
