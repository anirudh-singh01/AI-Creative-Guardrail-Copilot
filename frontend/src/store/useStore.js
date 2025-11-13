import { create } from 'zustand'

const useStore = create((set, get) => ({
  canvas: null,
  canvasObjects: [],
  selectedObject: null,
  complianceIssues: [],
  isLoading: false,
  currentFormat: '1:1', // 1:1, 9:16, 16:9
  
  setCanvas: (canvas) => set({ canvas }),
  
  addObject: (object) => set((state) => ({
    canvasObjects: [...state.canvasObjects, object]
  })),
  
  removeObject: (id) => set((state) => ({
    canvasObjects: state.canvasObjects.filter(obj => obj.id !== id)
  })),
  
  setSelectedObject: (object) => set({ selectedObject: object }),
  
  setComplianceIssues: (issues) => set({ complianceIssues: issues }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setCurrentFormat: (format) => set({ currentFormat: format }),
  
  clearCanvas: () => set({ canvasObjects: [], selectedObject: null, complianceIssues: [] }),
}))

export default useStore

