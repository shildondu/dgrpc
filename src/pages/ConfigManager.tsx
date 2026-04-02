import { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Input, InputNumber, Switch, message, Popconfirm, Space } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, LinkOutlined } from '@ant-design/icons'
import { ListConfigs, SaveConfig, DeleteConfig } from '../../wailsjs/go/main/App'
import { useConfigStore, ConnectionConfig } from '../stores/protoStore'

export default function ConfigManager() {
  const { configs, setConfigs, setActiveConfig } = useConfigStore()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ConnectionConfig | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const result = await ListConfigs()
      setConfigs(result || [])
    } catch (error) {
      message.error(`加载配置失败: ${error}`)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await SaveConfig(values.name, {
        name: values.name,
        address: values.address,
        timeout: values.timeout || 30,
        useTLS: values.useTLS || false,
        insecureSkip: values.insecureSkip || false,
      })
      message.success('配置已保存')
      setModalVisible(false)
      form.resetFields()
      loadConfigs()
    } catch (error) {
      message.error(`保存失败: ${error}`)
    }
  }

  const handleDelete = async (name: string) => {
    try {
      await DeleteConfig(name)
      message.success('配置已删除')
      loadConfigs()
    } catch (error) {
      message.error(`删除失败: ${error}`)
    }
  }

  const handleUse = (config: ConnectionConfig) => {
    setActiveConfig(config)
    message.success(`已激活配置: ${config.name}`)
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'TLS',
      dataIndex: 'useTLS',
      key: 'useTLS',
      render: (v: boolean) => (v ? '是' : '否'),
    },
    {
      title: '超时(秒)',
      dataIndex: 'timeout',
      key: 'timeout',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ConnectionConfig) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => handleUse(record)}
          >
            使用
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingConfig(record)
              form.setFieldsValue(record)
              setModalVisible(true)
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此配置?"
            onConfirm={() => handleDelete(record.name)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="连接配置"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingConfig(null)
              form.resetFields()
              setModalVisible(true)
            }}
          >
            新建配置
          </Button>
        }
      >
        <Table
          dataSource={configs}
          columns={columns}
          rowKey="name"
          pagination={false}
        />
      </Card>

      <Modal
        title={editingConfig ? '编辑配置' : '新建配置'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical" initialValues={{ timeout: 30 }}>
          <Form.Item
            name="name"
            label="配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="我的 gRPC 服务" disabled={!!editingConfig} />
          </Form.Item>

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
      </Modal>
    </div>
  )
}
