import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Form, Input, InputNumber, Switch, Button, message, Typography, Space, Divider, Spin } from 'antd'
import { PlayCircleOutlined, SaveOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import { InvokeMethod, SaveConfig } from '../../wailsjs/go/main/App'
import { useProtoStore, useConfigStore } from '../stores/protoStore'

const { Title, Text } = Typography

interface InvokeResponse {
  success: boolean
  data: string
  error?: string
  duration: number
}

export default function MethodInvoke() {
  const { serviceName, methodName } = useParams()
  const { services, messages } = useProtoStore()
  const { activeConfig } = useConfigStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<InvokeResponse | null>(null)
  const [requestJson, setRequestJson] = useState('')

  // Find the method info
  const methodInfo = useMemo(() => {
    const service = services.find((s) => s.name === serviceName)
    return service?.methods.find((m) => m.name === methodName)
  }, [services, serviceName, methodName])

  // Generate default request template
  useEffect(() => {
    if (methodInfo) {
      const inputMessage = messages.find((m) => m.name === methodInfo.inputType)
      if (inputMessage) {
        const template: Record<string, any> = {}
        inputMessage.fields.forEach((field) => {
          template[field.name] = getDefaultValue(field.type, field.repeated)
        })
        setRequestJson(JSON.stringify(template, null, 2))
      }
    }
  }, [methodInfo, messages])

  // Load active config
  useEffect(() => {
    if (activeConfig) {
      form.setFieldsValue({
        address: activeConfig.address,
        timeout: activeConfig.timeout,
        useTLS: activeConfig.useTLS,
        insecureSkip: activeConfig.insecureSkip,
      })
    }
  }, [activeConfig, form])

  const getDefaultValue = (type: string, repeated: boolean): any => {
    if (repeated) return []
    switch (type) {
      case 'TYPE_STRING':
        return ''
      case 'TYPE_INT32':
      case 'TYPE_INT64':
      case 'TYPE_UINT32':
      case 'TYPE_UINT64':
        return 0
      case 'TYPE_BOOL':
        return false
      case 'TYPE_FLOAT':
      case 'TYPE_DOUBLE':
        return 0.0
      default:
        return null
    }
  }

  const handleInvoke = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const result = await InvokeMethod({
        address: values.address,
        serviceName,
        methodName,
        requestData: requestJson,
        timeout: values.timeout || 30,
        useTLS: values.useTLS || false,
        insecureSkip: values.insecureSkip || false,
      })

      setResponse(result)

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

  const handleSaveConfig = async () => {
    try {
      const values = await form.validateFields()
      await SaveConfig(`${serviceName}-${methodName}`, {
        name: `${serviceName}-${methodName}`,
        address: values.address,
        timeout: values.timeout,
        useTLS: values.useTLS,
        insecureSkip: values.insecureSkip,
      })
      message.success('配置已保存')
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

  return (
    <div>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Card title="请求配置">
          <Form form={form} layout="vertical" initialValues={{ timeout: 30 }}>
            <Form.Item
              name="address"
              label="服务地址"
              rules={[{ required: true, message: '请输入服务地址' }]}
            >
              <Input placeholder="localhost:50051" />
            </Form.Item>

            <Form.Item name="timeout" label="超时时间 (秒)">
              <InputNumber min={1} max={300} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="useTLS" label="使用 TLS" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item name="insecureSkip" label="跳过证书验证" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>

          <Divider>请求参数 (JSON)</Divider>

          <div style={{ height: '300px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
            <Editor
              height="300px"
              defaultLanguage="json"
              value={requestJson}
              onChange={(value) => setRequestJson(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleInvoke}
              loading={loading}
            >
              调用
            </Button>
            <Button icon={<SaveOutlined />} onClick={handleSaveConfig}>
              保存配置
            </Button>
          </div>
        </Card>

        <Card title="响应结果">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <Text type="secondary" style={{ display: 'block', marginTop: '16px' }}>
                调用中...
              </Text>
            </div>
          ) : response ? (
            <>
              <div style={{ marginBottom: '12px' }}>
                <Space>
                  <Text>
                    状态: {response.success ? (
                      <Text type="success">成功</Text>
                    ) : (
                      <Text type="danger">失败</Text>
                    )}
                  </Text>
                  <Text>耗时: {response.duration}ms</Text>
                </Space>
              </div>

              {response.error && (
                <div style={{ marginBottom: '12px', color: '#ff4d4f' }}>
                  {response.error}
                </div>
              )}

              <div style={{ height: '350px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
                <Editor
                  height="350px"
                  defaultLanguage="json"
                  value={response.data || ''}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    readOnly: true,
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              点击"调用"按钮发送请求
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
