import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { Layout } from 'antd'
import Sidebar from './components/Sidebar'
import ProtoImport from './pages/ProtoImport'
import ServiceList from './pages/ServiceList'
import MethodInvoke from './pages/MethodInvoke'
import ConfigManager from './pages/ConfigManager'
import { useProtoStore } from './stores/protoStore'
import './App.css'

const { Sider, Content } = Layout

function App() {
  const [collapsed, setCollapsed] = useState(false)
  const { initialized, loadSavedProtos } = useProtoStore()

  useEffect(() => {
    loadSavedProtos()
  }, [loadSavedProtos])

  if (!initialized) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Layout style={{ height: '100vh' }}>
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            width={250}
            theme="light"
          >
            <Sidebar collapsed={collapsed} />
          </Sider>
          <Content style={{ padding: '16px', overflow: 'auto' }}>
            <Routes>
              <Route path="/" element={<ProtoImport />} />
              <Route path="/services" element={<ServiceList />} />
              <Route path="/invoke/:serviceName/:methodName" element={<MethodInvoke />} />
              <Route path="/config" element={<ConfigManager />} />
            </Routes>
          </Content>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
