import { useMemo, useState, useEffect } from 'react'
import { Menu, Input, Button, Tooltip, message, Popconfirm } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ImportOutlined,
  ApiOutlined,
  SettingOutlined,
  FunctionOutlined,
  AppstoreOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useProtoStore } from '../stores/protoStore'
import type { MenuProps } from 'antd'

type MenuItem = Required<MenuProps>['items'][number]

interface SidebarProps {
  collapsed?: boolean
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { services, protoPaths, reloadProtos, removeProtoPath } = useProtoStore()
  const [searchText, setSearchText] = useState('')
  const [openKeys, setOpenKeys] = useState<string[]>([])
  const [reloading, setReloading] = useState(false)

  const filteredServices = useMemo(() => {
    if (!searchText.trim()) return services
    const lowerSearch = searchText.toLowerCase()
    return services
      .map((service) => ({
        ...service,
        methods: service.methods.filter(
          (method) =>
            method.name.toLowerCase().includes(lowerSearch) ||
            service.name.toLowerCase().includes(lowerSearch)
        ),
      }))
      .filter((service) => service.methods.length > 0 || service.name.toLowerCase().includes(lowerSearch))
  }, [services, searchText])

  const matchedServiceKeys = useMemo(() => {
    if (!searchText.trim()) return []
    return filteredServices.map((s) => `service-${s.name}`)
  }, [filteredServices, searchText])

  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [
      {
        key: '/',
        icon: <ImportOutlined />,
        label: '导入 Proto',
      },
      {
        key: 'services-group',
        icon: <AppstoreOutlined />,
        label: '服务列表',
        children:
          filteredServices.length > 0
            ? filteredServices.map((service) => ({
                key: `service-${service.name}`,
                icon: <ApiOutlined />,
                label: service.name,
                children: service.methods.map((method) => ({
                  key: `/invoke/${service.name}/${method.name}`,
                  icon: <FunctionOutlined />,
                  label: method.name,
                })),
              }))
            : [
                {
                  key: 'no-services',
                  label: (
                    <span style={{ color: '#999', fontSize: '12px' }}>
                      {services.length === 0 ? '暂无服务，请导入' : '未找到匹配项'}
                    </span>
                  ),
                  disabled: true,
                },
              ],
      },
      {
        key: '/config',
        icon: <SettingOutlined />,
        label: '配置管理',
      },
    ]
    return items
  }, [filteredServices, services.length])

  const getSelectedKeys = () => {
    const path = location.pathname
    if (path.startsWith('/invoke/')) {
      return [path]
    }
    return [path]
  }

  // 搜索时自动展开匹配的服务
  useEffect(() => {
    if (searchText.trim() && matchedServiceKeys.length > 0) {
      setOpenKeys(['services-group', ...matchedServiceKeys])
    } else if (!searchText.trim()) {
      const path = location.pathname
      if (path.startsWith('/invoke/')) {
        const parts = path.split('/')
        const serviceName = parts[2]
        if (serviceName) {
          setOpenKeys(['services-group', `service-${serviceName}`])
        }
      }
    }
  }, [searchText, matchedServiceKeys, location.pathname])

  // 初始化时根据路由展开
  useEffect(() => {
    if (collapsed) {
      setOpenKeys([])
      return
    }
    const path = location.pathname
    if (path.startsWith('/invoke/')) {
      const parts = path.split('/')
      const serviceName = parts[2]
      if (serviceName) {
        setOpenKeys(['services-group', `service-${serviceName}`])
      }
    }
  }, [collapsed, location.pathname])

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (key.startsWith('/')) {
      navigate(key)
    }
  }

  const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
    setOpenKeys(keys as string[])
  }

  const handleReload = async () => {
    setReloading(true)
    try {
      await reloadProtos()
      message.success('已刷新所有 Proto 文件')
    } catch (err) {
      message.error('刷新失败')
    } finally {
      setReloading(false)
    }
  }

  const handleRemovePath = (path: string) => {
    removeProtoPath(path)
    message.success('已移除')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: collapsed ? '14px' : '18px',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {collapsed ? 'D' : 'dgrpc'}
      </div>

      {!collapsed && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            placeholder="搜索服务/方法"
            prefix={<SearchOutlined style={{ color: '#999' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            size="small"
          />
        </div>
      )}

      {!collapsed && protoPaths.length > 0 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>已导入文件 ({protoPaths.length})</span>
            <Tooltip title="重新加载所有 Proto">
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined spin={reloading} />}
                onClick={handleReload}
                loading={reloading}
              />
            </Tooltip>
          </div>
          <div style={{ maxHeight: '120px', overflow: 'auto' }}>
            {protoPaths.map((path) => {
              const fileName = path.split('/').pop() || path
              const serviceCount = services.filter(s => s.sourceProto === path).length
              return (
                <div
                  key={path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    marginBottom: '4px',
                    background: '#fff',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                >
                  <Tooltip title={path}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      <FileTextOutlined style={{ marginRight: '4px', color: '#1890ff' }} />
                      {fileName}
                      <span style={{ color: '#999', marginLeft: '4px' }}>({serviceCount})</span>
                    </span>
                  </Tooltip>
                  <Popconfirm
                    title="移除此 Proto？"
                    description="相关服务将被删除"
                    onConfirm={() => handleRemovePath(path)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Menu
        mode="inline"
        selectedKeys={getSelectedKeys()}
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        items={menuItems}
        onClick={handleClick}
        style={{ borderRight: 0, flex: 1, overflow: 'auto' }}
      />
    </div>
  )
}
