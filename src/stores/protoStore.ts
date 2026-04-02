import { create } from 'zustand'

export interface MethodInfo {
  name: string
  inputType: string
  outputType: string
  isClientStream: boolean
  isServerStream: boolean
}

export interface ServiceInfo {
  name: string
  methods: MethodInfo[]
}

export interface MessageInfo {
  name: string
  fields: FieldInfo[]
}

export interface FieldInfo {
  name: string
  type: string
  number: number
  repeated: boolean
  optional: boolean
}

export interface ProtoState {
  services: ServiceInfo[]
  messages: MessageInfo[]
  protoPath: string
  setServices: (services: ServiceInfo[]) => void
  setMessages: (messages: MessageInfo[]) => void
  setProtoPath: (path: string) => void
  clear: () => void
}

export const useProtoStore = create<ProtoState>((set) => ({
  services: [],
  messages: [],
  protoPath: '',
  setServices: (services) => set({ services }),
  setMessages: (messages) => set({ messages }),
  setProtoPath: (protoPath) => set({ protoPath }),
  clear: () => set({ services: [], messages: [], protoPath: '' }),
}))

export interface ConnectionConfig {
  name: string
  address: string
  useTLS: boolean
  insecureSkip: boolean
  timeout: number
  metadata?: Record<string, string>
}

export interface ConfigState {
  configs: ConnectionConfig[]
  activeConfig: ConnectionConfig | null
  setConfigs: (configs: ConnectionConfig[]) => void
  setActiveConfig: (config: ConnectionConfig | null) => void
}

export const useConfigStore = create<ConfigState>((set) => ({
  configs: [],
  activeConfig: null,
  setConfigs: (configs) => set({ configs }),
  setActiveConfig: (activeConfig) => set({ activeConfig }),
}))
