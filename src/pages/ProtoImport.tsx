import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Button, message, Card, Typography } from 'antd'
import { InboxOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { ImportProto } from '../../wailsjs/go/main/App'
import { useProtoStore } from '../stores/protoStore'

const { Dragger } = Upload
const { Title, Paragraph } = Typography

interface ParseResult {
  services: Array<{
    name: string
    methods: Array<{
      name: string
      inputType: string
      outputType: string
      isClientStream: boolean
      isServerStream: boolean
    }>
  }>
  messages: Array<{
    name: string
    fields: Array<{
      name: string
      type: string
      number: number
      repeated: boolean
      optional: boolean
    }>
  }>
}

export default function ProtoImport() {
  const navigate = useNavigate()
  const { setServices, setMessages, setProtoPath } = useProtoStore()
  const [loading, setLoading] = useState(false)

  const handleImport = async (file: File) => {
    setLoading(true)
    try {
      // Wails provides file path through webkitRelativePath
      const filePath = (file as any).path || file.webkitRelativePath || file.name

      const result = await ImportProto(filePath)

      setServices(result.services || [])
      setMessages(result.messages || [])
      setProtoPath(filePath)

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
          选择或拖拽 proto 文件到下方区域，系统将自动解析服务定义
        </Paragraph>

        <Dragger
          accept=".proto"
          showUploadList={false}
          beforeUpload={(file) => {
            handleImport(file)
            return false
          }}
          disabled={loading}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 proto 文件到此区域</p>
          <p className="ant-upload-hint">
            支持 .proto 文件，导入后可查看服务列表并调用方法
          </p>
        </Dragger>

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
