import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from 'antd'
import Sidebar from './components/Sidebar'
import ProtoImport from './pages/ProtoImport'
import ServiceList from './pages/ServiceList'
import MethodInvoke from './pages/MethodInvoke'
import ConfigManager from './pages/ConfigManager'

const { Sider, Content } = Layout

function App() {
  return (
    <BrowserRouter>
      <Layout style={{ height: '100vh' }}>
        <Sider width={250} theme="light">
          <Sidebar />
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
  )
}

export default App
