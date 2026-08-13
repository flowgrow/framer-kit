import { create } from "zustand"

import type { EmblaStore } from "./types.js"

/** Shared config and API registry used by all Embla overrides on the page. */
export const useEmblaStore = create<EmblaStore>((set, get) => ({
  configs: new Map(),
  emblaInstances: new Map(),
  addConfig: (id, config) =>
    set((state) => {
      const configs = new Map(state.configs)
      configs.set(id, config)
      return { configs }
    }),
  removeConfig: (id, config) =>
    set((state) => {
      if (config && state.configs.get(id) !== config) return state
      const configs = new Map(state.configs)
      configs.delete(id)
      return { configs }
    }),
  getConfig: (id) => get().configs.get(id),
  addEmblaInstance: (id, instance) =>
    set((state) => {
      const emblaInstances = new Map(state.emblaInstances)
      emblaInstances.set(id, instance)
      return { emblaInstances }
    }),
  removeEmblaInstance: (id, instance) =>
    set((state) => {
      if (instance && state.emblaInstances.get(id) !== instance) return state
      const emblaInstances = new Map(state.emblaInstances)
      emblaInstances.delete(id)
      return { emblaInstances }
    }),
  getInstance: (id) => get().emblaInstances.get(id),
}))
