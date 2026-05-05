import { useState, useEffect } from 'react'
import { Card, Button, Form, Input, Switch, Space, message, Tabs, Divider } from 'antd'
import { ReloadOutlined, SendOutlined } from '@ant-design/icons'
import { notificationApi } from '../services/api'

interface NotificationType {
  key: string
  label: string
  icon: string
}

const notificationTypes: NotificationType[] = [
  { key: 'email', label: '邮件通知', icon: '📧' },
  { key: 'dingtalk', label: '钉钉通知', icon: '💬' },
  { key: 'feishu', label: '飞书通知', icon: '📮' },
  { key: 'webhook', label: 'WebHook', icon: '🔗' },
  { key: 'telegram', label: 'Telegram', icon: '✈️' },
  { key: 'wechat', label: '企业微信', icon: '💚' },
]

function Notifications() {
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)

  const [emailForm] = Form.useForm()
  const [dingtalkForm] = Form.useForm()
  const [feishuForm] = Form.useForm()
  const [webhookForm] = Form.useForm()
  const [telegramForm] = Form.useForm()
  const [wechatForm] = Form.useForm()

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const response = await notificationApi.list()
      const configs = response.data
      
      configs.forEach(config => {
        let formData = {}
        if (config.config) {
          try {
            formData = JSON.parse(config.config)
          } catch {
            formData = {}
          }
        }
        const formValue = { ...formData, is_enabled: config.is_enabled }
        
        switch(config.type) {
          case 'email':
            emailForm.setFieldsValue(formValue)
            break
          case 'dingtalk':
            dingtalkForm.setFieldsValue(formValue)
            break
          case 'feishu':
            feishuForm.setFieldsValue(formValue)
            break
          case 'webhook':
            webhookForm.setFieldsValue(formValue)
            break
          case 'telegram':
            telegramForm.setFieldsValue(formValue)
            break
          case 'wechat':
            wechatForm.setFieldsValue(formValue)
            break
        }
      })
    } catch (error) {
      message.error('获取通知配置失败')
      console.error('Failed to fetch notification configs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  const handleSave = async (type: string, form: any) => {
    try {
      const values = await form.validateFields()
      const config = {
        type,
        is_enabled: values.is_enabled || false,
        config: JSON.stringify({ ...values, is_enabled: undefined })
      }
      
      message.success('配置保存成功')
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  const handleTest = async () => {
    setTestLoading(true)
    try {
      await notificationApi.test()
      message.success('测试通知发送成功')
    } catch (error) {
      message.error('测试通知发送失败')
      console.error('Failed to test notification:', error)
    } finally {
      setTestLoading(false)
    }
  }

  const tabItems = notificationTypes.map((type) => ({
    key: type.key,
    label: `${type.icon} ${type.label}`,
    children: renderNotificationForm(type.key),
  }))

  function renderNotificationForm(type: string) {
    let form: any
    let formItems: React.ReactNode = null

    switch(type) {
      case 'email':
        form = emailForm
        formItems = (
          <>
            <Form.Item name="is_enabled" label="启用通知" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
            <Form.Item
              name="smtp_host"
              label="SMTP服务器"
              rules={[{ required: true, message: '请输入SMTP服务器地址' }]}
            >
              <Input placeholder="smtp.example.com" />
            </Form.Item>
            <Form.Item
              name="smtp_port"
              label="SMTP端口"
              rules={[{ required: true, message: '请输入SMTP端口' }]}
            >
              <Input type="number" placeholder="587" />
            </Form.Item>
            <Form.Item
              name="sender"
              label="发件人邮箱"
              rules={[{ required: true, message: '请输入发件人邮箱' }]}
            >
              <Input placeholder="noreply@example.com" />
            </Form.Item>
            <Form.Item
              name="password"
              label="授权密码"
              rules={[{ required: true, message: '请输入授权密码' }]}
            >
              <Input.Password placeholder="授权密码或应用专用密码" />
            </Form.Item>
            <Form.Item
              name="recipients"
              label="收件人列表"
              rules={[{ required: true, message: '请输入收件人列表' }]}
              help="多个邮箱用逗号分隔"
            >
              <Input.TextArea rows={2} placeholder="admin1@example.com, admin2@example.com" />
            </Form.Item>
          </>
        )
        break

      case 'dingtalk':
        form = dingtalkForm
        formItems = (
          <>
            <Form.Item name="is_enabled" label="启用通知" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
            <Form.Item
              name="webhook"
              label="WebHook地址"
              rules={[{ required: true, message: '请输入WebHook地址' }]}
            >
              <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx" />
            </Form.Item>
            <Form.Item
              name="secret"
              label="加签密钥"
              help="可选，使用加签验证时填写"
            >
              <Input placeholder="SECxxx" />
            </Form.Item>
          </>
        )
        break

      case 'feishu':
        form = feishuForm
        formItems = (
          <>
            <Form.Item name="is_enabled" label="启用通知" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
            <Form.Item
              name="webhook"
              label="WebHook地址"
              rules={[{ required: true, message: '请输入WebHook地址' }]}
            >
              <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx" />
            </Form.Item>
          </>
        )
        break

      case 'webhook':
        form = webhookForm
        formItems = (
          <>
            <Form.Item name="is_enabled" label="启用通知" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
            <Form.Item
              name="url"
              label="回调地址"
              rules={[{ required: true, message: '请输入回调地址' }]}
            >
              <Input placeholder="https://your-webhook-url.com/notify" />
            </Form.Item>
            <Form.Item
              name="method"
              label="请求方法"
            >
              <select style={{ width: '100%', height: 32, padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9' }}>
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
            </Form.Item>
          </>
        )
        break

      case 'telegram':
        form = telegramForm
        formItems = (
          <>
            <Form.Item name="is_enabled" label="启用通知" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
            <Form.Item
              name="bot_token"
              label="Bot Token"
              rules={[{ required: true, message: '请输入Bot Token' }]}
            >
              <Input.Password placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" />
            </Form.Item>
            <Form.Item
              name="chat_ids"
              label="接收消息的Chat ID"
              rules={[{ required: true, message: '请输入Chat ID' }]}
              help="多个ID用逗号分隔"
            >
              <Input placeholder="12345678, 87654321" />
            </Form.Item>
          </>
        )
        break

      case 'wechat':
        form = wechatForm
        formItems = (
          <>
            <Form.Item name="is_enabled" label="启用通知" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
            <Form.Item
              name="webhook"
              label="WebHook地址"
              rules={[{ required: true, message: '请输入WebHook地址' }]}
            >
              <Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" />
            </Form.Item>
          </>
        )
        break
    }

    return (
      <Card
        loading={loading}
        extra={
          <Space>
            <Button icon={<SendOutlined />} loading={testLoading} onClick={handleTest}>
              测试通知
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchConfigs}>
              刷新
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
          {formItems}
          <Divider />
          <Form.Item>
            <Space>
              <Button type="primary" onClick={() => handleSave(type, form)}>
                保存配置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    )
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
        <h2 style={{ margin: 0 }}>通知配置</h2>
      </div>

      <Tabs items={tabItems} />
    </div>
  )
}

export default Notifications
