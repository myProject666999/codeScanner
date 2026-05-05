import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Layout, Menu, Button, theme } from 'antd'
import {
  DashboardOutlined,
  SettingOutlined,
  SearchOutlined,
  AlertOutlined,
  GlobalOutlined,
  KeyOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Results from './pages/Results'
import Notifications from './pages/Notifications'
import Proxy from './pages/Proxy'
import Tokens from './pages/Tokens'

const { Header, Sider, Content } = Layout

function App() {
  const [collapsed, setCollapsed] = useState(false)
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">仪表盘</Link>,
    },
    {
      key: '/tokens',
      icon: <KeyOutlined />,
      label: <Link to="/tokens">令牌管理</Link>,
    },
    {
      key: '/tasks',
      icon: <SearchOutlined />,
      label: <Link to="/tasks">扫描任务</Link>,
    },
    {
      key: '/results',
      icon: <AlertOutlined />,
      label: <Link to="/results">扫描结果</Link>,
    },
    {
      key: '/notifications',
      icon: <SettingOutlined />,
      label: <Link to="/notifications">通知配置</Link>,
    },
    {
      key: '/proxy',
      icon: <GlobalOutlined />,
      label: <Link to="/proxy">代理配置</Link>,
    },
  ]

  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
          <div
            style={{
              height: 64,
              margin: 16,
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: borderRadiusLG,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: collapsed ? 16 : 18,
              fontWeight: 'bold',
            }}
          >
            {collapsed ? 'CS' : '代码泄露监控'}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={['/']}
            selectedKeys={[window.location.pathname]}
            items={menuItems}
          />
        </Sider>
        <Layout>
          <Header
            style={{
              padding: '0 24px',
              background: colorBgContainer,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 64, height: 64 }}
            />
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>代码泄露监控系统</div>
          </Header>
          <Content
            style={{
              margin: '24px 16px',
              padding: 24,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              minHeight: 280,
            }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tokens" element={<Tokens />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/results" element={<Results />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/proxy" element={<Proxy />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </BrowserRouter>
  )
}

export default App
