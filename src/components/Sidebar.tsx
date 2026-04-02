import { Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ImportOutlined,
  ApiOutlined,
  SettingOutlined,
} from '@ant-design/icons'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      key: '/',
      icon: <ImportOutlined />,
      label: '导入 Proto',
    },
    {
      key: '/services',
      icon: <ApiOutlined />,
      label: '服务列表',
    },
    {
      key: '/config',
      icon: <SettingOutlined />,
      label: '配置管理',
    },
  ]

  return (
    <div style={{ height: '100%' }}>
      <div style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '18px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        dgrpc
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ borderRight: 0 }}
      />
    </div>
  )
}
