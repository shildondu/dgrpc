import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Tree, Typography, Empty, Tag, Space } from 'antd'
import {
  ApiOutlined,
  FunctionOutlined,
  ImportOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useProtoStore } from '../stores/protoStore'

const { Title, Text } = Typography

export default function ServiceList() {
  const navigate = useNavigate()
  const { services, protoPaths } = useProtoStore()

  const treeData = useMemo(() => {
    return services.map((service) => {
      const protoName = service.sourceProto?.split('/').pop() || ''
      return {
        key: service.name,
        title: (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ApiOutlined style={{ color: '#1890ff' }} />
            <span>{service.name}</span>
            <Tag color="blue">{service.methods.length} 方法</Tag>
            {protoName && <Tag color="default">{protoName}</Tag>}
          </span>
        ),
        children: service.methods.map((method) => ({
          key: `${service.name}/${method.name}`,
          title: (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FunctionOutlined style={{ color: '#52c41a' }} />
              <span>{method.name}</span>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {method.inputType} → {method.outputType}
              </Text>
              {method.isServerStream && <Tag color="orange">Server Stream</Tag>}
              {method.isClientStream && <Tag color="purple">Client Stream</Tag>}
            </span>
          ),
          isLeaf: true,
        })),
      }
    })
  }, [services])

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0) return

    const key = selectedKeys[0] as string
    const parts = key.split('/')

    // Only navigate if it's a method (has both service and method name)
    if (parts.length === 2) {
      navigate(`/invoke/${parts[0]}/${parts[1]}`)
    }
  }

  if (services.length === 0) {
    return (
      <Card>
        <Empty
          image={<ImportOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />}
          description="暂无服务，请先导入 proto 文件"
        >
          <button onClick={() => navigate('/')}>去导入</button>
        </Empty>
      </Card>
    )
  }

  return (
    <div>
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            服务列表
          </Title>
          <Space>
            {protoPaths.map((path, idx) => (
              <Tag key={idx} icon={<FileTextOutlined />} color="green">
                {path.split('/').pop()}
              </Tag>
            ))}
          </Space>
        </div>
      </Card>

      <Card>
        <Tree
          showLine
          defaultExpandAll
          treeData={treeData}
          onSelect={handleSelect}
          style={{ fontSize: '14px' }}
        />
      </Card>
    </div>
  )
}
