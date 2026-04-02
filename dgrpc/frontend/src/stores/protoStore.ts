import { create } from 'zustand'
import { proto, config } from '../../wailsjs/go/models'
import { SaveProtoPaths, LoadProtoPaths, ImportProto } from '../../wailsjs/go/main/App'

export type MethodInfo = proto.MethodInfo
export type ServiceInfo = proto.ServiceInfo
export type MessageInfo = proto.MessageInfo
export type FieldInfo = proto.FieldInfo

export interface StoredService {
  name: string
  methods: MethodInfo[]
  sourceProto?: string
}

export interface StoredMessage {
  name: string
  fields: FieldInfo[]
  sourceProto?: string
}

export interface ProtoState {
  services: StoredService[]
  messages: StoredMessage[]
  protoPaths: string[]
  initialized: boolean
  setServices: (services: ServiceInfo[]) => void
  addServices: (services: ServiceInfo[], protoPath: string) => void
  setMessages: (messages: MessageInfo[]) => void
  addMessages: (messages: MessageInfo[], protoPath: string) => void
  setProtoPath: (path: string) => void
  addProtoPath: (path: string) => void
  removeProtoPath: (path: string) => void
  clear: () => void
  loadSavedProtos: () => Promise<void>
  reloadProtos: () => Promise<void>
}

export const useProtoStore = create<ProtoState>((set, get) => ({
  services: [],
  messages: [],
  protoPaths: [],
  initialized: false,
  setServices: (services) => set({ services: services.map(s => ({ name: s.name, methods: s.methods })) }),
  addServices: (newServices, protoPath) => set((state) => {
    const existingNames = new Set(state.services.map(s => s.name))
    const servicesToAdd = newServices
      .filter(s => !existingNames.has(s.name))
      .map(s => ({
        name: s.name,
        methods: s.methods,
        sourceProto: protoPath
      }))
    const newPaths = state.protoPaths.includes(protoPath) ? state.protoPaths : [...state.protoPaths, protoPath]
    SaveProtoPaths(newPaths).catch(() => {})
    return { services: [...state.services, ...servicesToAdd], protoPaths: newPaths }
  }),
  setMessages: (messages) => set({ messages: messages.map(m => ({ name: m.name, fields: m.fields })) }),
  addMessages: (newMessages, protoPath) => set((state) => {
    const existingNames = new Set(state.messages.map(m => m.name))
    const messagesToAdd = newMessages
      .filter(m => !existingNames.has(m.name))
      .map(m => ({
        name: m.name,
        fields: m.fields,
        sourceProto: protoPath
      }))
    return { messages: [...state.messages, ...messagesToAdd] }
  }),
  setProtoPath: (protoPath) => set({ protoPaths: [protoPath] }),
  addProtoPath: (path) => set((state) => {
    if (!state.protoPaths.includes(path)) {
      const newPaths = [...state.protoPaths, path]
      SaveProtoPaths(newPaths).catch(() => {})
      return { protoPaths: newPaths }
    }
    return state
  }),
  removeProtoPath: (path) => set((state) => {
    const newPaths = state.protoPaths.filter(p => p !== path)
    const newServices = state.services.filter(s => s.sourceProto !== path)
    const newMessages = state.messages.filter(m => m.sourceProto !== path)
    SaveProtoPaths(newPaths).catch(() => {})
    return { protoPaths: newPaths, services: newServices, messages: newMessages }
  }),
  clear: () => {
    SaveProtoPaths([]).catch(() => {})
    set({ services: [], messages: [], protoPaths: [] })
  },
  loadSavedProtos: async () => {
    if (get().initialized) return
    try {
      const paths = await LoadProtoPaths()
      if (!paths || paths.length === 0) {
        set({ initialized: true })
        return
      }
      set({ protoPaths: paths })
      for (const path of paths) {
        try {
          const result = await ImportProto(path)
          if (result.services) {
            get().addServices(result.services, path)
          }
          if (result.messages) {
            get().addMessages(result.messages, path)
          }
        } catch {
          // skip failed imports
        }
      }
      set({ initialized: true })
    } catch {
      set({ initialized: true })
    }
  },
  reloadProtos: async () => {
    const paths = get().protoPaths
    // Clear current data but keep paths
    set({ services: [], messages: [] })
    for (const path of paths) {
      try {
        const result = await ImportProto(path)
        if (result.services) {
          get().addServices(result.services, path)
        }
        if (result.messages) {
          get().addMessages(result.messages, path)
        }
      } catch {
        // skip failed imports
      }
    }
  },
}))

export type ConnectionConfig = config.ConnectionConfig

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
