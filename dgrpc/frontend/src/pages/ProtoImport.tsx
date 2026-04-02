import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, message, Card, Typography } from 'antd'
import { InboxOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { OpenFileDialog, ImportProto } from '../../wailsjs/go/main/App'
import { useProtoStore } from '../stores/protoStore'

const { Title, Paragraph } = Typography

export default function ProtoImport() {
  const navigate = useNavigate()
  const { addServices, addMessages } = useProtoStore()
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    setLoading(true)
    try {
      const filePath = await OpenFileDialog()
      if (!filePath) {
        setLoading(false)
        return
      }

      const result = await ImportProto(filePath)

      addServices(result.services || [], filePath)
      addMessages(result.messages || [], filePath)

      message.success(`成功解析 ${result.services?.length || 0} 个服务, ${result.messages?.length || 0} 个消息类型`)

      if (result.services && result.services.length > 0) {
        navigate('/services')
      }
    } catch (error) {
      message.error(`解析失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <Title level={3}>导入 Proto 文件</Title>
        <Paragraph type="secondary">
          点击下方按钮选择 proto 文件，系统将自动解析服务定义
        </Paragraph>

        <div
          onClick={handleImport}
          style={{
            border: '1px dashed #d9d9d9',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.3s',
            backgroundColor: loading ? '#fafafa' : 'transparent',
          }}
        >
          <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>
            {loading ? '正在解析...' : '点击选择 Proto 文件'}
          </p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            支持 .proto 文件，导入后可查看服务列表并调用方法
          </p>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            onClick={() => navigate('/services')}
          >
            查看服务列表
          </Button>
        </div>
      </Card>
    </div>
  )
}
