import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Form, Input, InputNumber, Switch, Button, message, Typography, Space, Spin, Row, Col, Tabs, Select } from 'antd'
import { PlayCircleOutlined, SaveOutlined, FormatPainterOutlined, ClearOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import { InvokeMethod, SaveMethodScheme, LoadMethodScheme, ListConfigs } from '../../wailsjs/go/main/App'
import { grpc, config } from '../../wailsjs/go/models'
import { useProtoStore, useConfigStore, StoredMessage, ConnectionConfig } from '../stores/protoStore'

const { Title, Text } = Typography

export default function MethodInvoke() {
  const { serviceName, methodName } = useParams()
  const { services, messages } = useProtoStore()
  const { setActiveConfig } = useConfigStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<grpc.InvokeResponse | null>(null)
  const [requestJson, setRequestJson] = useState('')
  const [activeTab, setActiveTab] = useState('payload')
  const [configs, setConfigs] = useState<ConnectionConfig[]>([])
  const [selectedConfigName, setSelectedConfigName] = useState<string>('')
  const [schemeLoaded, setSchemeLoaded] = useState(false)

  useEffect(() => {
    loadConfigs()
  }, [])

  // Reset and load scheme when method changes
  useEffect(() => {
    setSchemeLoaded(false)
    setResponse(null)
    setSelectedConfigName('')
    form.resetFields()
    setRequestJson('')
  }, [serviceName, methodName])

  // Load saved scheme after reset
  useEffect(() => {
    if (serviceName && methodName && !schemeLoaded) {
      loadSavedScheme()
    }
  }, [serviceName, methodName, schemeLoaded])

  const loadConfigs = async () => {
    try {
      const result = await ListConfigs()
      setConfigs(result || [])
    } catch {
      // ignore
    }
  }

  const loadSavedScheme = async () => {
    try {
      const scheme = await LoadMethodScheme(serviceName || '', methodName || '')
      if (scheme) {
        form.setFieldsValue({
          address: scheme.address,
          timeout: scheme.timeout,
          useTLS: scheme.useTLS,
          insecureSkip: scheme.insecureSkip,
        })
        if (scheme.requestData) {
          setRequestJson(scheme.requestData)
        }
        if (scheme.configName) {
          setSelectedConfigName(scheme.configName)
        }
        message.success('已恢复上次保存的方案')
      } else {
        // No saved scheme, generate default template
        generateDefaultTemplate()
      }
      setSchemeLoaded(true)
    } catch {
      generateDefaultTemplate()
      setSchemeLoaded(true)
    }
  }

  const generateDefaultTemplate = () => {
    if (methodInfo) {
      const inputMessage = messages.find((m) => m.name === methodInfo.inputType)
      if (inputMessage) {
        const template = generateTemplate(inputMessage, messages)
        setRequestJson(JSON.stringify(template, null, 2))
      } else {
        setRequestJson('{}')
      }
    }
  }

  const methodInfo = useMemo(() => {
    const service = services.find((s) => s.name === serviceName)
    return service?.methods.find((m) => m.name === methodName)
  }, [services, serviceName, methodName])

  const generateTemplate = (msg: StoredMessage, allMessages: StoredMessage[], depth = 0): Record<string, any> => {
    if (depth > 5) return {}

    const template: Record<string, any> = {}
    for (const field of msg.fields) {
      template[field.name] = getDefaultValue(field.type, field.repeated, field.name, allMessages, depth)
    }
    return template
  }

  const getDefaultValue = (
    type: string,
    repeated: boolean,
    fieldName: string,
    allMessages: StoredMessage[],
    depth: number
  ): any => {
    if (repeated) return []

    switch (type) {
      case 'TYPE_STRING':
        return ''
      case 'TYPE_INT32':
      case 'TYPE_INT64':
      case 'TYPE_SINT32':
      case 'TYPE_SINT64':
      case 'TYPE_UINT32':
      case 'TYPE_UINT64':
      case 'TYPE_FIXED32':
      case 'TYPE_FIXED64':
      case 'TYPE_SFIXED32':
      case 'TYPE_SFIXED64':
        return 0
      case 'TYPE_BOOL':
        return false
      case 'TYPE_FLOAT':
      case 'TYPE_DOUBLE':
        return 0.0
      case 'TYPE_BYTES':
        return ''
    }

    const msgType = type.replace('TYPE_MESSAGE', '').replace('TYPE_ENUM', '')
    const nestedMsg = allMessages.find(m =>
      m.name === type ||
      m.name === msgType ||
      m.name === fieldName
    )

    if (nestedMsg) {
      return generateTemplate(nestedMsg, allMessages, depth + 1)
    }

    if (type.startsWith('TYPE_')) {
      return undefined
    }
    return {}
  }

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(requestJson)
      setRequestJson(JSON.stringify(parsed, null, 2))
      message.success('格式化成功')
    } catch {
      message.error('JSON 格式错误，无法格式化')
    }
  }

  const handleClearJson = () => {
    setRequestJson('{\n  \n}')
  }

  const handleInvoke = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const req = new grpc.InvokeRequest()
      req.address = values.address || ''
      req.serviceName = serviceName || ''
      req.methodName = methodName || ''
      req.requestData = requestJson
      req.timeout = values.timeout || 30
      req.useTLS = values.useTLS || false
      req.insecureSkip = values.insecureSkip || false

      const result = await InvokeMethod(req)
      setResponse(result)
      setActiveTab('payload')

      if (result.success) {
        message.success(`调用成功，耗时 ${result.duration}ms`)
      } else {
        message.error(result.error || '调用失败')
      }
    } catch (error) {
      message.error(`调用失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveScheme = async () => {
    try {
      const values = await form.validateFields()
      const scheme = new config.MethodScheme()
      scheme.serviceName = serviceName || ''
      scheme.methodName = methodName || ''
      scheme.configName = selectedConfigName || ''
      scheme.address = values.address || ''
      scheme.timeout = values.timeout || 30
      scheme.useTLS = values.useTLS || false
      scheme.insecureSkip = values.insecureSkip || false
      scheme.requestData = requestJson
      scheme.updatedAt = new Date().toISOString()

      await SaveMethodScheme(scheme)
      message.success('方案已保存，下次打开将自动恢复')
    } catch (error) {
      message.error(`保存失败: ${error}`)
    }
  }

  if (!methodInfo) {
    return (
      <Card>
        <Text type="secondary">方法未找到</Text>
      </Card>
    )
  }

  let displayData = ''
  if (response?.data) {
    try {
      const parsed = JSON.parse(response.data)
      displayData = JSON.stringify(parsed, null, 2)
    } catch {
      displayData = response.data
    }
  }

  const contextData = useMemo(() => {
    if (!response) return ''
    const ctx: Record<string, any> = {}
    if (response.header && Object.keys(response.header).length > 0) {
      ctx.header = response.header
    }
    if (response.trailer && Object.keys(response.trailer).length > 0) {
      ctx.trailer = response.trailer
    }
    if (Object.keys(ctx).length === 0) return ''
    return JSON.stringify(ctx, null, 2)
  }, [response])

  const tabItems = [
    {
      key: 'payload',
      label: 'Payload',
      children: (
        <div style={{ height: '350px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
          <Editor
            height="350px"
            defaultLanguage="json"
            value={displayData}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              readOnly: true,
            }}
          />
        </div>
      ),
    },
    {
      key: 'context',
      label: `Context${response?.header || response?.trailer ? ` (${(response?.header ? Object.keys(response.header).length : 0) + (response?.trailer ? Object.keys(response.trailer).length : 0)})` : ''}`,
      children: (
        <div style={{ height: '350px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
          <Editor
            height="350px"
            defaultLanguage="json"
            value={contextData || '{\n  "header": {},\n  "trailer": {}\n}'}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              readOnly: true,
            }}
          />
        </div>
      ),
    },
  ]

  return (
    <div>
      {/* 标题栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0 }}>
          {serviceName} / {methodName}
        </Title>
        <Space style={{ marginTop: '8px' }}>
          <Text type="secondary">
            输入: {methodInfo.inputType} → 输出: {methodInfo.outputType}
          </Text>
          {methodInfo.isServerStream && <Text type="warning">Server Streaming</Text>}
          {methodInfo.isClientStream && <Text type="warning">Client Streaming</Text>}
        </Space>
      </Card>

      {/* 模块 1: 请求配置 */}
      <Card title="请求配置" style={{ marginBottom: '16px' }}>
        <Form form={form} initialValues={{ timeout: 30 }}>
          <Row gutter={24}>
            <Col span={5}>
              <Form.Item label="选择配置" style={{ width: '100%', marginBottom: 0 }}>
                <Select
                  placeholder="选择已保存的配置"
                  value={selectedConfigName || undefined}
                  onChange={(name) => {
                    setSelectedConfigName(name || '')
                    const cfg = configs.find((c) => c.name === name)
                    if (cfg) {
                      form.setFieldsValue({
                        address: cfg.address,
                        timeout: cfg.timeout,
                        useTLS: cfg.useTLS,
                        insecureSkip: cfg.insecureSkip,
                      })
                    }
                  }}
                  allowClear
                  options={configs.map((c) => ({ label: `${c.name} (${c.address})`, value: c.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="address"
                label="服务地址"
                rules={[{ required: true, message: '请输入服务地址' }]}
                style={{ width: '100%', marginBottom: 0 }}
              >
                <Input placeholder="localhost:50051" />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="timeout" label="超时(秒)" style={{ width: '100%', marginBottom: 0 }}>
                <InputNumber min={1} max={300} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={2}>
              <Form.Item name="useTLS" label="TLS" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="insecureSkip" label="跳过验证" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item style={{ marginBottom: 0 }}>
                <Space>
                  <Button icon={<SaveOutlined />} onClick={handleSaveScheme}>
                    保存
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleInvoke}
                    loading={loading}
                  >
                    发起调用
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 模块 2: 请求参数 */}
      <Card
        title="请求参数"
        style={{ marginBottom: '16px' }}
        extra={
          <Space>
            <Button size="small" icon={<FormatPainterOutlined />} onClick={handleFormatJson}>
              格式化
            </Button>
            <Button size="small" icon={<ClearOutlined />} onClick={handleClearJson}>
              清空
            </Button>
          </Space>
        }
      >
        <div style={{ height: '300px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
          <Editor
            height="300px"
            defaultLanguage="json"
            value={requestJson}
            onChange={(value) => setRequestJson(value || '{}')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </div>
      </Card>

      {/* 模块 3: 响应结果 */}
      <Card title="响应结果">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px' }}>
            <Spin size="large" />
            <Text type="secondary" style={{ display: 'block', marginTop: '16px' }}>
              调用中...
            </Text>
          </div>
        ) : response ? (
          <>
            <div style={{ marginBottom: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
              <Space size="large">
                <Text>
                  状态: {response.success ? (
                    <Text type="success" strong>成功</Text>
                  ) : (
                    <Text type="danger" strong>失败</Text>
                  )}
                </Text>
                <Text>耗时: <Text strong>{response.duration}ms</Text></Text>
              </Space>
            </div>

            {response.error && (
              <div style={{ marginBottom: '12px', padding: '12px', background: '#fff2f0', borderRadius: '4px', color: '#ff4d4f', whiteSpace: 'pre-wrap' }}>
                {response.error}
              </div>
            )}

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
            />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
            点击"发起调用"按钮发送请求
          </div>
        )}
      </Card>
    </div>
  )
}
