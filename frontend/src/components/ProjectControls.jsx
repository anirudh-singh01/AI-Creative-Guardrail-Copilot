import { useState, useEffect } from 'react'
import { Save, FolderOpen, Trash2 } from 'lucide-react'
import useStore from '../store/useStore'
import { saveProject, loadProject, restoreCanvas, hasSavedProject, deleteProject } from '../utils/projectStorage'

const ProjectControls = () => {
  const { canvas, currentFormat, complianceIssues, setCurrentFormat, setComplianceIssues, setLoading, isLoading } = useStore()
  const [hasProject, setHasProject] = useState(hasSavedProject())

  // Check for saved project when canvas is ready
  useEffect(() => {
    if (canvas) {
      setHasProject(hasSavedProject())
    }
  }, [canvas])

  const handleSave = async () => {
    if (!canvas) {
      alert('Canvas not initialized')
      return
    }

    setLoading(true)
    try {
      const success = await saveProject(canvas, {
        currentFormat,
        complianceIssues,
      })

      if (success) {
        setHasProject(true)
        alert('Project saved successfully!')
      } else {
        alert('Failed to save project')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert(`Failed to save: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLoad = async () => {
    if (!canvas) {
      alert('Canvas not initialized')
      return
    }

    const projectData = loadProject()
    if (!projectData) {
      alert('No saved project found')
      return
    }

    // Confirm before loading (will overwrite current canvas)
    if (!confirm('Load saved project? This will replace your current canvas.')) {
      return
    }

    setLoading(true)
    try {
      const success = await restoreCanvas(canvas, projectData)

      if (success) {
        // Restore state
        if (projectData.state) {
          if (projectData.state.currentFormat) {
            setCurrentFormat(projectData.state.currentFormat)
          }
          if (projectData.state.complianceIssues) {
            setComplianceIssues(projectData.state.complianceIssues)
          }
        }

        setHasProject(true)
        alert('Project loaded successfully!')
      } else {
        alert('Failed to load project')
      }
    } catch (error) {
      console.error('Load error:', error)
      alert(`Failed to load: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    if (!hasProject) {
      alert('No saved project to delete')
      return
    }

    if (confirm('Delete saved project? This cannot be undone.')) {
      deleteProject()
      setHasProject(false)
      alert('Project deleted')
    }
  }

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <button
        onClick={handleSave}
        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-xs sm:text-sm hover:from-green-600 hover:to-emerald-600 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-[1.02] font-medium"
        disabled={!canvas || isLoading}
        title="Save project to browser storage"
      >
        <Save size={16} />
        <span className="hidden sm:inline">Save</span>
      </button>
      <button
        onClick={handleLoad}
        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-lg text-xs sm:text-sm hover:from-neon-cyan/90 hover:to-neon-purple/90 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-[1.02] font-medium"
        disabled={!canvas || isLoading}
        title="Load saved project"
      >
        <FolderOpen size={16} />
        <span className="hidden sm:inline">Load</span>
      </button>
      {hasProject && (
        <button
          onClick={handleDelete}
          className="px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg text-xs sm:text-sm hover:from-red-600 hover:to-pink-600 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all duration-300 shadow-card hover:shadow-card-hover transform hover:scale-[1.02]"
          disabled={isLoading}
          title="Delete saved project"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  )
}

export default ProjectControls

